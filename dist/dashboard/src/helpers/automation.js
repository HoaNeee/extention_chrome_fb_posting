import {
  KEY_ALL_GROUPS,
  KEY_INDEXS_GROUP_CHECKED,
  KEY_IS_SCROLL_DETECT_LIST_GROUP,
  KEY_IS_TEST,
  KEY_STOP_TASK,
} from "../../../contants/contants.js";
import { showNotify } from "../draw_element/notify.js";
import { logError, now } from "../utils/utils.js";
import {
  getDataGroupsSavedNeedPost,
  getGroupsMatch,
  getListGroups,
  setGroupsNeedPost,
} from "./group.js";
import {
  getIsStopTaskInStorage,
  getStrictlyMatchTitleGroupInStorage,
  setProgress,
} from "./storage.js";
import { GM_getValue, GM_setValue } from "../utils/api-helper.js";

async function automation({ forceChange = false, isTest = false } = {}) {
  try {
    GM_setValue(KEY_IS_TEST, isTest || false);
    GM_setValue(KEY_STOP_TASK, false);
    setProgress(true);

    //check have all groups
    const allGroups = await GM_getValue(KEY_ALL_GROUPS);
    if (forceChange || !allGroups || !Array.isArray(allGroups)) {
      GM_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, true);
    }

    //check have data need post
    const dataNeedPosts = await getDataGroupsSavedNeedPost();
    if (
      !dataNeedPosts ||
      !Array.isArray(dataNeedPosts) ||
      !dataNeedPosts.length
    ) {
      showNotify({
        message: "No data need post, please check again",
        type: "error",
      });
      setProgress(false);
      return;
    }

    const indexsChecked = await GM_getValue(KEY_INDEXS_GROUP_CHECKED);
    if (
      !indexsChecked ||
      !Array.isArray(indexsChecked) ||
      !indexsChecked.length
    ) {
      showNotify({
        message: "No group checked, please check again",
        type: "error",
      });
      setProgress(false);
      return;
    }

    const listGroups = (await getListGroups()) || [];

    const isStop = await getIsStopTaskInStorage();
    if (isStop) {
      showNotify({ message: "The task has been stopped", type: "error" });
      return;
    }

    if (!listGroups.length) {
      showNotify({ message: "No group found", type: "error" });
      setProgress(false);
      return;
    }

    const titleStrictlyMatch = await getStrictlyMatchTitleGroupInStorage();
    let list = [];
    for (const data of dataNeedPosts) {
      const title = data.title;
      const id = data.id;
      const name = data.name || "";
      const listGroupsMatch = getGroupsMatch({
        title,
        listGroups,
        titleStrictlyMatch,
      });

      list.push({ id, title, name, groups: listGroupsMatch });
    }

    //sort by groups length asc
    list = list.sort((a, b) => {
      return a.groups.length - b.groups.length;
    });

    GM_setValue(KEY_ALL_GROUPS, listGroups);

    await setGroupsNeedPost(list, forceChange);
  } catch (error) {
    logError("Error at automation: " + error);
    setProgress(false);
  }
}

export { automation };
