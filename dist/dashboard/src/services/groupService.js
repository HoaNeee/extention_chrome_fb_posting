import { KEY_GET_LIST_GROUPS } from "../../../contants/constant-extention.js";
import {
  KEY_ALL_GROUPS,
  KEY_GROUPS_NEED_POST,
  KEY_GROUPS_POSTED,
  KEY_STOP_TASK,
  URL_LIST_GROUPS,
} from "../../../contants/contants.js";
import {
  DB_getValue,
  DB_sendMessage,
  DB_setValue,
} from "../utils/api-helper.js";
import { logError, now } from "../../../utils/utils.js";

/**
 * @description This function will be redirect to list group page and scroll detect list group
 */
async function getListGroupsService() {
  try {
    DB_setValue(KEY_STOP_TASK, false);
    DB_sendMessage(KEY_GET_LIST_GROUPS, { url: URL_LIST_GROUPS });
  } catch (error) {
    logError("Error at get list group service", error);
  }
}

/**
 * Get the list of groups that need to be posted from storage
 * @returns {Promise<{
 * groups: Array<{id: string, title: string, name: string, priority: number, groups: Array<{id_href: string, status: string}>}>,
 * forceChange: boolean,
 * time: number}>
 * }
 * The object containing the groups and related information
 */
async function getListGroupsNeedPostInStorage() {
  const object = await DB_getValue(KEY_GROUPS_NEED_POST);

  return {
    groups: object?.groups || [],
    forceChange: object?.forceChange || false,
    time: object?.time || 0,
  };
}

/**
 * Get all group posted
 * @returns {Promise<Array<string>>} Array of group id posted
 */
async function getAllGroupPostedsInStorage() {
  const posteds = await DB_getValue(KEY_GROUPS_POSTED);
  return posteds || [];
}

/**
 * Set all group posted
 * @param {Array<string>} posteds - Array of group id posted
 * @returns {Promise<void>} void
 */
async function setAllGroupPostedsInStorage(posteds) {
  await DB_setValue(KEY_GROUPS_POSTED, posteds);
}

/**
 *
 * @returns {Promise<Array<{title: string, href: string}>|null>} array of all groups
 */
async function getAllDataGroupsInStorage() {
  try {
    const allGroups = await DB_getValue(KEY_ALL_GROUPS);
    return allGroups;
  } catch (error) {
    logError("Error getAllDataGroupsInStorage: " + error);
    throw new Error("Error getAllDataGroupsInStorage: " + error);
  }
}

/**
 *
 * @param {Array<{id: string, title: string, name: string, priority: number, groups: Array<{title: string, id_href: string}>}>} list
 * @returns no return
 */
async function setGroupsNeedPost(list) {
  try {
    const needPosts = [];

    for (const item of list) {
      const { id, title, name, priority, groups } = item;
      const grs = groups.map((gr) => ({
        id_href: gr.id_href || gr.href,
        status: "pending",
      }));
      needPosts.push({ id, title, name, priority, groups: grs });
    }

    DB_setValue(KEY_GROUPS_NEED_POST, {
      groups: needPosts,
      forceChange: true,
      time: now(),
    });
  } catch (error) {
    logError("Error set groups need post: " + error);
    throw new Error("Error set groups need post: " + error);
  }
}

export {
  getListGroupsService,
  setGroupsNeedPost,
  getAllDataGroupsInStorage,
  getAllGroupPostedsInStorage,
  getListGroupsNeedPostInStorage,
  setAllGroupPostedsInStorage,
};
