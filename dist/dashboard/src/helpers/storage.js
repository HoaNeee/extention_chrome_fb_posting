import {
  KEY_IS_IN_PROGRESS,
  KEY_INDEX_GROUP_POST,
  KEY_INDEXS_GROUP_CHECKED,
  KEY_STOP_TASK,
  initialTimeDelay,
  KEY_TIME_DELAY,
  KEY_IS_FIX_STEAL_FOCUS,
  KEY_QUEUE,
  KEY_TITLE_STRICTLY_MATCH_GROUP,
  KEY_LANGUAGE,
  KEY_IS_FIX_STEAL_ALL_FOCUS,
  KEY_IS_DEVELOPER_MODE,
  KEY_HISTORY_LOGS,
  APP_NAME,
  KEY_IS_SHUFFLE_GROUPS_NEED_POST,
} from "../../../contants/contants.js";
import {
  getAllGroupPostedsInStorage,
  getListGroupsNeedPostInStorage,
} from "../services/groupService.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";
import Queue from "../utils/queue.js";
import { logActions, logError, now, random } from "../../../utils/utils.js";

async function setProgress(b) {
  await DB_setValue(KEY_IS_IN_PROGRESS, b);
}

async function getProgress() {
  return (await DB_getValue(KEY_IS_IN_PROGRESS)) || false;
}

/**
 * Get the current id of the group being posted
 * @returns {Promise<string|null>} The current id (index) or null if not set
 */
async function getCurrentIndexGroupPost() {
  const index = await DB_getValue(KEY_INDEX_GROUP_POST);
  return index;
}

/**
 *
 * @param {string|null} index  The id of the group to set as currently being posted, or null to unset
 */
async function setCurrentIndexGroupPost(index) {
  await DB_setValue(KEY_INDEX_GROUP_POST, index);
}

/**
 * @returns {Promise<string|null>} random ID of group or NULL if all groups are posted and reset to pending
 */
async function getRandomIndexGroupChecked() {
  try {
    const objectList = await getListGroupsNeedPostInStorage();
    const listGroups = objectList?.groups || [];
    if (!listGroups.length) {
      return null;
    }

    const isShuffleGroup = await getIsShuffleGroupNeedPost();
    let index = 0;
    let id = listGroups[index].id;

    if (isShuffleGroup) {
      index = random(0, listGroups.length - 1);
      id = listGroups[index].id;
    }

    let need = listGroups[index];

    let groups = need?.groups || [];

    const posteds = await getAllGroupPostedsInStorage();
    const set = new Set(posteds);

    groups = groups.filter((gr) => !set.has(gr.id_href));

    const isAllNotPending = groups.every((gr) => gr.status !== "pending");

    if (isAllNotPending) {
      let isPostedAll = true;
      for (const gr of listGroups) {
        if (gr.id === id) continue;

        const groupsTemp = gr?.groups || [];
        const isExistPending = groupsTemp.some(
          (gr) => gr.status === "pending" && !set.has(gr.id_href),
        );
        if (isExistPending) {
          id = gr.id;
          isPostedAll = false;
          break;
        }
      }

      if (isPostedAll) {
        //reset all -> return null
        logActions("Reset all groups need post to pending");
        return null;
      }

      return id;
    }

    return id;
  } catch (error) {
    throw new Error("Error getRandomIndexGroupChecked: " + error);
  }
}

async function getIsStopTaskInStorage() {
  return (await DB_getValue(KEY_STOP_TASK)) || false;
}

/**
 *
 * @param {typeof initialTimeDelay} timeDelay
 */
function setTimeDelayInStorage(timeDelay = initialTimeDelay) {
  DB_setValue(KEY_TIME_DELAY, timeDelay);
}

/**
 *
 * @returns {Promise<typeof initialTimeDelay>} The time delay settings from storage, or the initial default if not set
 */
async function getTimeDelayInStorage() {
  const timeDelay = await DB_getValue(KEY_TIME_DELAY);
  if (!timeDelay) {
    setTimeDelayInStorage();
    return initialTimeDelay;
  }
  return timeDelay;
}

/**
 *
 * This setting determines whether the script will attempt to open new tabs in the background to avoid stealing focus from the user
 * when posting tasks. If true, new tabs will be opened as inactive; if false, they will be opened as active.
 * This is a workaround for the issue where opening new tabs for posting tasks can steal focus away from the user, which can be disruptive.
 *
 * @returns {Promise<boolean>} The setting for whether to fix the steal focus issue, defaulting to false if not set
 */
async function getIsStealFocusInStorage() {
  return (await DB_getValue(KEY_IS_FIX_STEAL_FOCUS)) || false;
}

/**
 *
 * @returns {Promise<boolean>} The setting for whether to fix the steal all focus issue, defaulting to false if not set
 */
async function getIsFixStealAllFocusInStorage() {
  return (await DB_getValue(KEY_IS_FIX_STEAL_ALL_FOCUS)) || false;
}

/**
 *
 * @param {{queue: Array<{name: string, data: any}>, time: number}} queue
 */
function setQueueInStorage(queue) {
  DB_setValue(KEY_QUEUE, queue);
}

/**
 *
 * @returns {Promise<{queue: Queue, time: number}>} The queue of tasks or actions stored in storage, defaulting to an empty array if not set
 */
async function getQueueInStorage() {
  const queueObject = await DB_getValue(KEY_QUEUE);
  const queue = new Queue(queueObject?.queue || []);

  return { queue, time: queueObject?.time || now() - 10000 };
}

/**
 *
 * @param {string} strictlyMatchTitleGroup string of keywords to strictly match title group (split by ',')
 */
function setStrictlyMatchTitleGroupInStorage(strictlyMatchTitleGroup = "") {
  DB_setValue(KEY_TITLE_STRICTLY_MATCH_GROUP, strictlyMatchTitleGroup);
}

/**
 *
 * @returns {Promise<string>} array of string keywords to strictly match title group
 */
async function getStrictlyMatchTitleGroupInStorage() {
  const data = await DB_getValue(KEY_TITLE_STRICTLY_MATCH_GROUP);
  if (data && Array.isArray(data)) {
    const strData = data.join(", ");
    setStrictlyMatchTitleGroupInStorage(strData);
    return strData.trim();
  }
  if (data === undefined || data === null) {
    const initData = `Cho thuê trọ, Tìm phòng trọ, Cho thuê phòng trọ, CCMN, Phòng trọ, Tìm phòng trọ giá rẻ`;
    setStrictlyMatchTitleGroupInStorage(initData);
    return initData.trim();
  }
  return data.trim();
}

async function getLanguageInStorage() {
  const lang = await DB_getValue(KEY_LANGUAGE);
  if (lang === undefined || lang === null) {
    DB_setValue(KEY_LANGUAGE, "en");
    return "en";
  }
  return lang;
}

async function getIsDeveloperModeInStorage() {
  return (await DB_getValue(KEY_IS_DEVELOPER_MODE)) || false;
}

/**
 * @returns {Promise<Array<{msgObject: {vi: string, en: string}|string, time: number}>>}  The history logs stored in storage, defaulting to an empty array if not set
 */
async function getHistoryLogsInStorage() {
  return (await DB_getValue(KEY_HISTORY_LOGS)) || [];
}

/**
 * @returns {Promise<boolean>} The setting for whether to shuffle groups need post, defaulting to false if not set
 */
async function getIsShuffleGroupNeedPost() {
  return (await DB_getValue(KEY_IS_SHUFFLE_GROUPS_NEED_POST)) || false;
}

/**
 *
 * @param {{vi: string, en: string}} msg log to add to history
 */
async function addHistoryLog(msg = {}) {
  if (!msg) {
    return null;
  }

  try {
    const historyLogs = await getHistoryLogsInStorage();
    const time = now();
    historyLogs.push({ msg, time });
    if (historyLogs.length > 150) {
      historyLogs.shift();
    }
    await DB_setValue(KEY_HISTORY_LOGS, historyLogs);
    return { msg, time };
  } catch (error) {
    logError(`Error addHistoryLog`, error);
  }
}

async function clearHistoryLogs() {
  try {
    await DB_setValue(KEY_HISTORY_LOGS, []);
  } catch (error) {
    logError(`Error clearHistoryLogs`, error);
  }
}

export {
  setProgress,
  getProgress,
  getRandomIndexGroupChecked,
  getCurrentIndexGroupPost,
  setCurrentIndexGroupPost,
  getIsStopTaskInStorage,
  setTimeDelayInStorage,
  getTimeDelayInStorage,
  getIsStealFocusInStorage,
  setQueueInStorage,
  getQueueInStorage,
  setStrictlyMatchTitleGroupInStorage,
  getStrictlyMatchTitleGroupInStorage,
  getLanguageInStorage,
  getIsFixStealAllFocusInStorage,
  getIsDeveloperModeInStorage,
  addHistoryLog,
  getHistoryLogsInStorage,
  clearHistoryLogs,
  getIsShuffleGroupNeedPost,
};
