import {
  KEY_GROUPS_NEED_POST,
  KEY_IS_IN_PROGRESS,
  KEY_SCHEDULER,
  KEY_DATA_POST_SAVED,
  KEY_INDEX_GROUP_POST,
  KEY_INDEXS_GROUP_CHECKED,
  KEY_STOP_TASK,
  initialTimeDelay,
  KEY_TIME_DELAY,
  KEY_IS_FIX_STEAL_FOCUS,
  KEY_QUEUE,
  KEY_GROUPS_POSTED,
  KEY_TITLE_STRICTLY_MATCH_GROUP,
  KEY_SCHEDULER_RELOAD_DASHBOARD,
} from "../../../contants/contants.js";
import { GM_getValue, GM_setValue } from "../utils/api-helper.js";
import { DataSavedDB } from "../utils/dataSavedDB.js";
import Queue from "../utils/queue.js";
import { logActions, now, random } from "../utils/utils.js";
import {
  createSchedulerDailyHours,
  createSchedulerReloadDashboard,
} from "./scheduler.js";

/**
 * Get the list of groups that need to be posted from storage
 * @returns {Promise<{
 * groups: Array<{id: string, title: string, name: string, groups: Array<{id_href: string, status: string}>}>,
 * forceChange: boolean,
 * time: number}>
 * }
 * The object containing the groups and related information
 */
async function getListGroupsNeedPostInStorage() {
  const object = await GM_getValue(KEY_GROUPS_NEED_POST);

  return {
    groups: object?.groups || [],
    forceChange: object?.forceChange || false,
    time: object?.time || 0,
  };
}

async function setProgress(b) {
  await GM_setValue(KEY_IS_IN_PROGRESS, b);
}

async function getProgress() {
  return (await GM_getValue(KEY_IS_IN_PROGRESS)) || false;
}

const initScheduler = {
  type: "daily-hours", //custom-every-hours, custom-every-minutes, frame-hours
  frameHours: [],
  schedulerMinutes: [],
  schedulerHours: [],
  dailyHours: createSchedulerDailyHours(),
  isScheduler: false,
  valueMinutes: 5,
  valueHours: 1,
  time: now(),
};

/**
 *
 * @param {typeof initScheduler} scheduler
 */
async function setSchedulerInStorage(scheduler = initScheduler) {
  const {
    dailyHours,
    frameHours,
    schedulerMinutes,
    schedulerHours,
    type,
    isScheduler,
    valueMinutes,
    valueHours,
    time,
  } = scheduler;

  await GM_setValue(KEY_SCHEDULER, {
    frameHours,
    schedulerMinutes,
    schedulerHours,
    dailyHours,
    type,
    isScheduler,
    valueMinutes,
    valueHours,
    time,
  });
}

/**
 *
 * @returns {Promise<typeof initScheduler>}
 */
async function getSchedulerInStorage() {
  const scheduler = await GM_getValue(KEY_SCHEDULER);
  if (!scheduler) {
    setSchedulerInStorage();
    return initScheduler;
  }
  return scheduler;
}

/**
 * @param {Array<{id: string, title: string, name: string, contents: string[], files: Blob[]}>} data array of data saved in storage
 * @returns no return
 */
async function setDataSavedInStorage(data) {
  try {
    const db = new DataSavedDB(KEY_DATA_POST_SAVED);
    await db.saveDataPosts(data || []);
  } catch (error) {
    logError("Error setDataSaved: " + error);
    throw new Error("Error setDataSaved: " + error);
  }
}

/**
 * @returns {Promise<Array<{id: string, title: string, name: string, contents: string[], files: Blob[]}>>} array of data saved in storage, if not exist return empty array
 */
async function getDataSavedInStorage() {
  try {
    const db = new DataSavedDB(KEY_DATA_POST_SAVED);
    let data = await db.getAllDataSaved();
    if (!data) {
      data = [];
      await db.saveDataPosts(data);
    }

    return data;
  } catch (error) {
    logError("Error getDataSaved: " + error);
    throw new Error("Error getDataSaved: " + error);
  }
}

/**
 * Get the current id of the group being posted
 * @returns {Promise<string|null>} The current id (index) or null if not set
 */
async function getCurrentIndexGroupPost() {
  const index = await GM_getValue(KEY_INDEX_GROUP_POST);
  return index;
}

/**
 *
 * @param {string|null} index  The id of the group to set as currently being posted, or null to unset
 */
async function setCurrentIndexGroupPost(index) {
  await GM_setValue(KEY_INDEX_GROUP_POST, index);
}

/**
 * @returns {Promise<string|null>} random ID of group or NULL if all groups are posted and reset to pending
 */
async function getRandomIndexGroupChecked() {
  try {
    const objectList = await getListGroupsNeedPostInStorage();
    const listGroups = objectList?.groups || [];
    const indexsChecked = (await GM_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];
    if (!indexsChecked.length) {
      return null;
    }
    const randomIndex = random(0, indexsChecked.length - 1);
    let id = indexsChecked[randomIndex];

    let need = listGroups.find((gr) => gr.id === id);

    let groups = need?.groups || [];
    const posteds = await getAllGroupPostedsInStorage();
    const set = new Set(posteds);
    groups = groups.filter((gr) => !set.has(gr.id_href));

    const isAllNotPending = groups.every((gr) => gr.status !== "pending");

    if (isAllNotPending) {
      let isPostedAll = true;
      for (const indexId of indexsChecked) {
        if (indexId === id) continue;
        const needTemp = listGroups.find((gr) => gr.id === indexId);
        const groupsTemp = needTemp?.groups || [];
        const isExistPending = groupsTemp.some(
          (gr) => gr.status === "pending" && !set.has(gr.id_href),
        );
        if (isExistPending) {
          id = indexId;
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
  return (await GM_getValue(KEY_STOP_TASK)) || false;
}

/**
 *
 * @param {typeof initialTimeDelay} timeDelay
 */
function setTimeDelayInStorage(timeDelay = initialTimeDelay) {
  GM_setValue(KEY_TIME_DELAY, timeDelay);
}

/**
 *
 * @returns {Promise<typeof initialTimeDelay>} The time delay settings from storage, or the initial default if not set
 */
async function getTimeDelayInStorage() {
  const timeDelay = await GM_getValue(KEY_TIME_DELAY);
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
  return (await GM_getValue(KEY_IS_FIX_STEAL_FOCUS)) || false;
}

/**
 * Get all group posted
 * @returns {Promise<Array<string>>} Array of group id posted
 */
async function getAllGroupPostedsInStorage() {
  const posteds = await GM_getValue(KEY_GROUPS_POSTED);
  return posteds || [];
}

/**
 *
 * @param {{queue: Array<{name: string, data: any}>, time: number}} queue
 */
function setQueueInStorage(queue) {
  GM_setValue(KEY_QUEUE, queue);
}

/**
 *
 * @returns {Promise<{queue: Queue, time: number}>} The queue of tasks or actions stored in storage, defaulting to an empty array if not set
 */
async function getQueueInStorage() {
  const queueObject = await GM_getValue(KEY_QUEUE);
  const queue = new Queue(queueObject?.queue || []);

  return { queue, time: queueObject?.time || now() - 10000 };
}

/**
 *
 * @param {string} strictlyMatchTitleGroup string of keywords to strictly match title group (split by ',')
 */
function setStrictlyMatchTitleGroupInStorage(strictlyMatchTitleGroup = "") {
  GM_setValue(KEY_TITLE_STRICTLY_MATCH_GROUP, strictlyMatchTitleGroup);
}

/**
 *
 * @returns {Promise<string>} array of string keywords to strictly match title group
 */
async function getStrictlyMatchTitleGroupInStorage() {
  const data = await GM_getValue(KEY_TITLE_STRICTLY_MATCH_GROUP);
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

/**
 *
 * @returns {Promise<Array<{h: number, m: number}>>}
 */
async function getSchedulerReloadDashboardInStorage() {
  const data = await GM_getValue(KEY_SCHEDULER_RELOAD_DASHBOARD);
  if (!data || !Array.isArray(data)) {
    const newData = await createSchedulerReloadDashboard();
    setSchedulerReloadDashboardInStorage(newData);
    return newData;
  }
  return data;
}

/**
 *
 * @param {Array<{h: number, m: number}>} data
 */
function setSchedulerReloadDashboardInStorage(data) {
  GM_setValue(KEY_SCHEDULER_RELOAD_DASHBOARD, data);
}

export {
  getListGroupsNeedPostInStorage,
  setProgress,
  getProgress,
  setSchedulerInStorage,
  getSchedulerInStorage,
  setDataSavedInStorage,
  getDataSavedInStorage,
  getRandomIndexGroupChecked,
  getCurrentIndexGroupPost,
  setCurrentIndexGroupPost,
  getIsStopTaskInStorage,
  setTimeDelayInStorage,
  getTimeDelayInStorage,
  getIsStealFocusInStorage,
  setQueueInStorage,
  getQueueInStorage,
  getAllGroupPostedsInStorage,
  setStrictlyMatchTitleGroupInStorage,
  getStrictlyMatchTitleGroupInStorage,
  getSchedulerReloadDashboardInStorage,
  setSchedulerReloadDashboardInStorage,
};
