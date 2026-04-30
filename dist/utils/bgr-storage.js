import {
  KEY_IS_IN_PROGRESS,
  KEY_POST,
  KEY_POST_LENGTH,
  STATUS_TASK,
} from "../contants/contants.js";
import {
  getAllGroupPostedsInStorage,
  setAllGroupPostedsInStorage,
} from "../dashboard/src/services/groupService.js";
import { logError } from "./utils.js";

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
    console.log("Update status task: ", status);
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
};
