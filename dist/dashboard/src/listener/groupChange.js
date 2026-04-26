import {
  KEY_GROUPS_POSTED,
  KEY_MAX_GROUP_PER_TIME,
  KEY_POST,
  KEY_POST_LENGTH,
} from "../contants";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo";
import { showNotify } from "../draw_element/notify";
import {
  getAllGroupPostedsInStorage,
  getIsStealFocusInStorage,
  getListGroupsNeedPostInStorage,
  getRandomIndexGroupChecked,
  setCurrentIndexGroupPost,
  setProgress,
} from "../helpers/storage";
import { GM_getValue, GM_setValue } from "../utils/api-helper.js";
import {
  getIsDashboardTab,
  logActions,
  logError,
  now,
  sleep,
} from "../utils/utils";

async function logPostedGroups() {
  const posteds = (await GM_getValue(KEY_GROUPS_POSTED)) || [];

  logActions("Posted: " + posteds.length);
  const maxGroupPerTime = (await GM_getValue(KEY_MAX_GROUP_PER_TIME)) || 0;
  const currentLength = (await GM_getValue(KEY_POST_LENGTH)) || 0;
  if (currentLength >= maxGroupPerTime && maxGroupPerTime > 0) {
    logActions("Reached max group per time");
  }
}

/**
 * Type of newValue | objectGroupsNeedPost: {
 * groups: [
 * 	{
 * 	 id: string,
 * 	 title: string,
 * 	 groups: [ {title: string, href: string} ]
 * 	}
 * ]
 * forceChange: boolean,
 * time: number,
 * }
 */

export default async function groupsNeedPostChangeListener(
  name,
  oldvalue,
  newValue,
  remove,
) {
  try {
    const object = await getListGroupsNeedPostInStorage();
    const listGroups = object?.groups || [];
    const forceChange = object?.forceChange || false;

    logActions("List groups need post changed: ", object);

    //just only log
    logPostedGroups();
    //end log

    //just run with first task
    if (Array.isArray(listGroups) && forceChange && getIsDashboardTab()) {
      if (!listGroups.length) {
        logActions("No group need post");
        setProgress(false);
        return;
      }

      const id = await getRandomIndexGroupChecked();

      if (!id) {
        logActions("Reset all groups need post to pending");
        return;
      }

      setCurrentIndexGroupPost(id);

      const need = listGroups.find((gr) => gr.id === id);
      const groups = need?.groups || [];
      const posteds = await getAllGroupPostedsInStorage();

      if (!groups || !groups.length) {
        showNotify({
          message: "No group need post",
          type: "error",
        });
        setProgress(false);
        return;
      }

      //first task
      const task = groups.find(
        (gr) => gr.status === "pending" && !posteds.includes(gr.id_href),
      );
      if (task) {
        logActions("First task", task);
        GM_setValue(KEY_POST_LENGTH, 0);

        await sleep(2000);

        GM_setValue(KEY_POST, { task, time: now() });

        const isFixStealFocus = await getIsStealFocusInStorage();

        if (isFixStealFocus) {
          GM_openInTab(task.id_href, { active: false, insert: true });
        } else {
          GM_openInTab(task.id_href, { active: true });
        }
      }
    }
    updateDataSavedInfo();
  } catch (e) {
    setProgress(false);
    logError("Error change list group: " + e);
    throw new Error("Error change list group: " + e);
  }
}
