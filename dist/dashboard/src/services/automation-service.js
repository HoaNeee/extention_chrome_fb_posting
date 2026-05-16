import {
  KEY_INDEXS_GROUP_CHECKED,
  KEY_IS_TEST,
  KEY_POST,
  KEY_POST_LENGTH,
  KEY_STOP_TASK,
  KEY_TAB,
  STATUS_TASK,
} from "../../../contants/contants.js";
import { showNotify } from "../draw_element/notify.js";
import { logActions, logError, now, sleep } from "../../../utils/utils.js";
import { getGroupsMatch } from "../helpers/group.js";
import {
  getIsFixStealAllFocusInStorage,
  getIsStealFocusInStorage,
  getIsStopTaskInStorage,
  getRandomIndexGroupChecked,
  getStrictlyMatchTitleGroupInStorage,
  setCurrentIndexGroupPost,
  setProgress,
} from "../helpers/storage.js";
import { DB_getValue, DB_openInTab, DB_setValue } from "../utils/api-helper.js";
import {
  getAllDataGroupsInStorage,
  getAllGroupPostedsInStorage,
  getListGroupsNeedPostInStorage,
  setAllGroupPostedsInStorage,
  setGroupsNeedPost,
} from "./groupService.js";
import { getDataGroupsSavedNeedPost } from "./dataSavedService.js";
import { setCurrentPostLength } from "../../../utils/bgr-storage.js";
import { addLog } from "../draw_element/panel-log.js";

async function autoWithFirstTask() {
  //run new task
  try {
    const object = await getListGroupsNeedPostInStorage();
    const listGroups = object?.groups || [];

    logActions("List groups: ", object);

    //just run with first task
    if (Array.isArray(listGroups)) {
      if (!listGroups.length) {
        showNotify({
          message: "No group need post",
          type: "error",
        });
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
      const set = new Set(posteds);

      if (!groups || !groups.length) {
        showNotify({
          message: "No group need post",
          type: "error",
        });
        setProgress(false);
        return;
      }

      addLog({
        vi: `Dữ liệu nhóm cần đăng đợt này: ${need.name} - số lượng nhóm: ${groups.length}`,
        en: `Data of groups need to post this batch: ${need.name} - number of groups: ${groups.length}`,
      });

      //first task
      const task = groups.find(
        (gr) => gr.status === STATUS_TASK.PENDING && !set.has(gr.id_href),
      );
      if (task) {
        logActions("First task", task);
        DB_setValue(KEY_POST_LENGTH, 0);

        await sleep(2000);

        DB_setValue(KEY_POST, { task, time: now() });

        const isFixStealFocus = await getIsStealFocusInStorage();
        const isFixStealAllFocus = await getIsFixStealAllFocusInStorage();
        if (isFixStealAllFocus) {
          const tabId = await DB_openInTab(task.id_href, {
            active: false,
            insert: true,
          });
          DB_setValue(KEY_TAB.LAST_POST_TAB_OPEN_ID, tabId);
        } else if (isFixStealFocus) {
          const tabId = await DB_openInTab(task.id_href, {
            active: false,
            insert: true,
          });
          DB_setValue(KEY_TAB.LAST_POST_TAB_OPEN_ID, tabId);
          setTimeout(() => {
            chrome.tabs.update(tabId, { active: true });
          }, 4000);
        } else {
          const tabId = await DB_openInTab(task.id_href, { active: true });
          DB_setValue(KEY_TAB.LAST_POST_TAB_OPEN_ID, tabId);
        }
      }
    }
  } catch (error) {
    logError("Error at autoWithFirstTask: " + error);
    throw error;
  }
}

async function automationHelper({ isTest = false } = {}) {
  try {
    DB_setValue(KEY_IS_TEST, isTest || false);
    DB_setValue(KEY_STOP_TASK, false);
    setProgress(true);

    //check have all groups
    const allGroups = await getAllDataGroupsInStorage();
    if (!allGroups || !Array.isArray(allGroups) || !allGroups.length) {
      showNotify({
        message: "No group found, please get list group first",
        type: "error",
      });
      setProgress(false);
      return;
    }

    const indexsChecked = await DB_getValue(KEY_INDEXS_GROUP_CHECKED);
    if (
      !indexsChecked ||
      !Array.isArray(indexsChecked) ||
      !indexsChecked.length
    ) {
      showNotify({
        message: "No group checked need post, please check again",
        type: "error",
      });
      setProgress(false);
      addLog({
        vi: "Tiện ích đã bị tạm dừng do đợt đăng bài này không có nhóm nào được chọn, hãy chọn nhóm để đăng.",
        en: "The utility has been paused because no group was selected for this batch, please select a group to post.",
      });
      return;
    }

    const dataSaveds = await getDataGroupsSavedNeedPost();

    const listGroups = allGroups;

    const isStop = await getIsStopTaskInStorage();
    if (isStop) {
      showNotify({ message: "The task has been stopped", type: "error" });
      addLog({
        vi: "Tiện ích đã bị tạm dừng.",
        en: "The utility has been paused.",
      });
      return;
    }

    if (!listGroups.length) {
      showNotify({ message: "No group found", type: "error" });
      addLog({
        vi: "Tiện ích đã bị tạm dừng do không tìm thấy nhóm nào cần đăng bài.",
        en: "The utility has been paused because no group was found for this batch.",
      });
      setProgress(false);
      return;
    }

    const titleStrictlyMatch = await getStrictlyMatchTitleGroupInStorage();
    let list = [];
    for (const data of dataSaveds) {
      const title = data.title;
      const id = data.id;
      const name = data.name || "";
      const priority = data.priority || 1;
      const listGroupsMatch = getGroupsMatch({
        title,
        listGroups,
        titleStrictlyMatch,
      });

      list.push({ id, title, name, priority, groups: listGroupsMatch });
    }

    // //sort by groups length asc
    list = list.sort((a, b) => {
      if (
        a.priority !== b.priority &&
        a.priority !== undefined &&
        b.priority !== undefined &&
        a.priority !== null &&
        b.priority !== null
      ) {
        return a.priority - b.priority;
      }
      return a.groups.length - b.groups.length;
    });

    await setGroupsNeedPost(list);

    autoWithFirstTask();
  } catch (error) {
    logError("Error at automation: " + error);
    throw error;
  }
}

async function automation() {
  try {
    setAllGroupPostedsInStorage([]);
    setCurrentPostLength(0);
    await automationHelper({ isTest: false });
  } catch (error) {
    logError("Error at automation: " + error);
    setProgress(false);
  }
}

async function automationTest() {
  try {
    setAllGroupPostedsInStorage([]);
    setCurrentPostLength(0);
    await automationHelper({ isTest: true });
  } catch (error) {
    logError("Error at automation: " + error);
    setProgress(false);
  }
}

async function automationContinue() {
  try {
    setCurrentPostLength(0);
    const isTest = await DB_getValue(KEY_IS_TEST, false);
    await automationHelper({ isTest });
  } catch (error) {
    logError("Error at automation: " + error);
    setProgress(false);
  }
}

export { automation, automationContinue, automationTest };
