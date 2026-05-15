import {
  KEY_COUNT_POST,
  KEY_IS_IN_PROGRESS,
  KEY_POST,
  KEY_POST_LENGTH,
  STATUS_TASK,
} from "../contants/contants.js";
import { addLog } from "../dashboard/src/draw_element/panel-log.js";
import {
  getAllGroupPostedsInStorage,
  setAllGroupPostedsInStorage,
} from "../dashboard/src/services/groupService.js";
import { logActions, logError } from "./utils.js";

async function BG_setValue(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function BG_getValue(key) {
  const res = await chrome.storage.local.get(key);
  if (res[key] !== undefined && res[key] !== null) {
    return res[key];
  }
  return null;
}

async function BG_deleteValue(key) {
  await chrome.storage.local.remove(key);
}

async function setProgressTool(b) {
  BG_setValue(KEY_IS_IN_PROGRESS, b);
}

async function getProgressTool() {
  return (await BG_getValue(KEY_IS_IN_PROGRESS)) || false;
}

/**
 *
 * @param {{task: {id_href: string, status: string}, time: number}} task
 */
async function saveTask(task) {
  await BG_setValue(KEY_POST, task);
}

/**
 * Set status for task
 * @param {'pending' | 'selecting' | 'posting' | 'done' | 'error'} status - Status of task can be 'posting', 'done', 'pending', 'selecting'
 */
async function setStatusTask(status) {
  try {
    const isProgress = await getProgressTool();
    if (!isProgress) {
      return;
    }
    logActions("Update status task: ", status);
    const taskObject = await getTask();

    if (!taskObject) {
      return;
    }

    const id_href = taskObject?.task?.id_href;
    taskObject.task.status = status;
    BG_setValue(KEY_POST, taskObject);
    if (status === STATUS_TASK.DONE || status === STATUS_TASK.ERROR) {
      if (status === STATUS_TASK.DONE) {
        const currentLengthPost = await getCurrentPostLength();
        setCurrentPostLength(currentLengthPost + 1);
      }
      const posteds = await getAllGroupPostedsInStorage();
      if (id_href && !posteds.includes(id_href)) {
        posteds.push(id_href);
        setAllGroupPostedsInStorage(posteds);
      }
    }
  } catch (error) {
    logError("Error at setStatusTask: ", error);
  }
}

/**
 *
 * @returns {Promise<{task: {id_href: string, status: string}, time: number}>}
 */
async function getTask() {
  return await BG_getValue(KEY_POST);
}

/**
 *
 * @returns {Promise<number>}
 */
async function getCurrentPostLength() {
  return (await BG_getValue(KEY_POST_LENGTH)) || 0;
}

/**
 *
 * @param {number} length
 */
async function setCurrentPostLength(length) {
  await BG_setValue(KEY_POST_LENGTH, length);
}

/**
 *
 * @returns {Promise<number>} Count post
 */
async function getCountPost() {
  return (await BG_getValue(KEY_COUNT_POST)) || 0;
}

/**
 * Set count post
 * @param {number} count - Count post
 */
async function setCountPost(count) {
  await BG_setValue(KEY_COUNT_POST, count);
}

export {
  BG_setValue,
  BG_getValue,
  BG_deleteValue,
  setProgressTool,
  getProgressTool,
  setStatusTask,
  getTask,
  getCurrentPostLength,
  setCurrentPostLength,
  saveTask,
  getCountPost,
  setCountPost,
};
