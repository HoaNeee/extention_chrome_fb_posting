import { KEY_GROUPS_NEED_POST } from "../contants";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo";
import { getListGroupsNeedPostInStorage } from "../helpers/storage";
import { logError } from "../utils/utils";

/**
 *
 * @param {string} name
 * @param {{task: {id_href: string, status: string}, time: number}|null} oldValue
 * @param {{task: {id_href: string, status: string}, time: number}|null} newValue
 * @param {boolean} remote
 */
export default async function postListener(name, oldValue, newValue, remote) {
  //this listener just update view UI (maybe is list groups need post)
  try {
    if (newValue && newValue.task && newValue.task.status !== "pending") {
      const task = newValue.task;
      const listGroups = (await getListGroupsNeedPostInStorage())?.groups || [];

      const idx = listGroups.findIndex((gr) =>
        gr.groups.some((g) => g.id_href === task.id_href),
      );

      if (idx !== -1) {
        const group = listGroups[idx];
        const groupIdx = group.groups.findIndex(
          (g) => g.id_href === task.id_href,
        );
        if (groupIdx !== -1) {
          group.groups[groupIdx] = task;
          GM_setValue(KEY_GROUPS_NEED_POST, {
            groups: listGroups,
            forceChange: false,
            time: Date.now(),
          });
        }
      }
    } else if (
      newValue &&
      newValue.task &&
      newValue.task.status === "pending"
    ) {
      updateDataSavedInfo();
    }
  } catch (error) {
    logError("Error at postListener: " + error);
  }
}
