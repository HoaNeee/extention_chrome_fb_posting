import {
  KEY_GROUPS_POSTED,
  KEY_GROUPS_NEED_POST,
  KEY_POST_LENGTH,
  KEY_INDEXS_GROUP_CHECKED,
  KEY_COUNT_RESET_GROUPS,
  MAX_GROUP_PER_TIME_INITIAL,
  KEY_MAX_GROUP_PER_TIME,
  STATUS_TASK,
  KEY_COUNT_POST,
} from "../../../contants/contants.js";
import { getDataSavedInStorage } from "../services/dataSavedService.js";
import {
  getAllGroupPostedsInStorage,
  getListGroupsNeedPostInStorage,
} from "../services/groupService.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";
import {
  cvString,
  getListTitle,
  logActions,
  logError,
  random,
  shuffleArray,
} from "../../../utils/utils.js";
import {
  getCurrentIndexGroupPost,
  getRandomIndexGroupChecked,
  getTimeDelayInStorage,
} from "./storage.js";

/**
 * Check if all group need post have been posted.
 * Note: if exist error, also return false, but log error to console
 *
 * @returns {Promise<boolean>} true if all group need post have been posted, false if exist group have not been posted or exist error
 * */
async function checkIsPostedAllGroup() {
  try {
    const object = await getListGroupsNeedPostInStorage();
    const indexsChecked = (await DB_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];
    const listGroups =
      object?.groups.filter((gr) => indexsChecked.includes(gr.id)) || [];

    const posteds = await getAllGroupPostedsInStorage();
    const set = new Set(posteds);
    for (const need of listGroups) {
      const groups = need?.groups || [];
      const isExistPending = groups.some(
        (gr) => !set.has(gr.id_href) && gr.status === "pending",
      );
      if (isExistPending) {
        return false;
      }
    }

    return true;
  } catch (error) {
    throw new Error("Error check posted all group: " + error);
  }
}

/**
 * Reset all group need post to pending and save to storage, also reset groups posted and post length
 */
async function resetPostedGroupAndSave() {
  try {
    const countReset = (await DB_getValue(KEY_COUNT_RESET_GROUPS)) || 0;
    DB_setValue(KEY_COUNT_RESET_GROUPS, countReset + 1);
    const object = await getListGroupsNeedPostInStorage();
    const listGroups = object?.groups || [];
    const newList = listGroups.map((need) => {
      const newGrs = (need?.groups || []).map((gr) => ({
        ...gr,
        status: STATUS_TASK.PENDING,
      }));
      return {
        ...need,
        groups: shuffleArray(newGrs),
      };
    });

    DB_setValue(KEY_POST_LENGTH, 0);
    DB_setValue(KEY_GROUPS_POSTED, []);
    DB_setValue(KEY_GROUPS_NEED_POST, { groups: newList, forceChange: false });
  } catch (error) {
    throw new Error("Error reset posted group and save: " + error);
  }
}

/**
 *
 * @param {{title: string, listGroups: Array<{title: string, href: string}>, titleStrictlyMatch: string}} object of string keywords to strictly match title group
 * @returns {Array<{title: string, id_href: string}>} array of groups that match with title, if not exist return empty array
 */
function getGroupsMatch({ title, listGroups, titleStrictlyMatch } = {}) {
  try {
    const data = [];
    const listTitle = getListTitle(title);
    if (!title || !title.trim() || !listTitle.length) {
      return data;
    }

    const listTitleStrictlyMatch = getListTitle(titleStrictlyMatch);

    const set = new Set();
    for (const tit of listTitle) {
      for (const gr of listGroups) {
        const convertTitleGroup = cvString(gr.title);

        const isMatchStrictly = !listTitleStrictlyMatch.length
          ? true
          : listTitleStrictlyMatch.some((tit) => {
              return convertTitleGroup.includes(tit);
            });

        const href = gr.href || gr.id_href;

        if (
          isMatchStrictly &&
          convertTitleGroup.includes(tit) &&
          !set.has(href)
        ) {
          set.add(href);
          data.push(gr);
        }
      }
    }

    return shuffleArray(data);
  } catch (error) {
    logError("Error get groups match: " + error);
    throw new Error("Error get groups match: " + error);
  }
}

/**
 *
 * @returns Object: { id, title, groups: [ {id_href, status} ] } or null if not exist
 */
async function getCurrentGroupNeedPost() {
  try {
    const objectList = await getListGroupsNeedPostInStorage();
    let currentIndexGroup = await getCurrentIndexGroupPost();

    if (!currentIndexGroup) {
      return null;
    }

    const listGroups = objectList?.groups || [];
    const need = listGroups.find((gr) => gr.id === currentIndexGroup);

    return need;
  } catch (error) {
    logActions("Error get current groups need post: " + error);
    throw new Error("Error get current groups need post: " + error);
  }
}

/**
 *
 * @returns {Promise<{ id, title, contents: string[], files: Blob[], priority: number }>} or null if not exist
 */
async function getCurrentDataGroupSavedNeedPost() {
  try {
    let id = await getCurrentIndexGroupPost();
    if (!id) {
      id = await getRandomIndexGroupChecked();
    }
    if (!id) {
      logActions("No group checked in storage");
      return null;
    }
    const data = (await getDataSavedInStorage()) || [];
    return data.find((d) => d.id === id) || null;
  } catch (error) {
    logActions("Error get current data group saved need post: " + error);
    throw new Error("Error get current data group saved need post: " + error);
  }
}

/**
 *
 * @returns {Promise<{ isPostedAll: boolean, isPostedMaxGroupPerTime: boolean }>}
 */
async function checkPostedAllGroupOrMaxGroupPerTime() {
  let isPostedMaxGroupPerTime = false;
  let isPostedAll = false;
  try {
    const currentLengthPost = (await DB_getValue(KEY_POST_LENGTH)) || 0;
    const maxGroupPerTime =
      (await DB_getValue(KEY_MAX_GROUP_PER_TIME)) || MAX_GROUP_PER_TIME_INITIAL;
    const per = random(0, 10);
    const diff = per >= 7 ? -1 : 0;
    const maxGroupPerTimeDiff = maxGroupPerTime + diff;
    if (
      currentLengthPost >= maxGroupPerTimeDiff ||
      (await checkIsPostedAllGroup())
    ) {
      if (await checkIsPostedAllGroup()) {
        isPostedAll = true;
      } else {
        isPostedMaxGroupPerTime = true;
      }
    }
  } catch (error) {
    logError("Error check posted all group or max group per time: ", error);
  }
  return { isPostedAll, isPostedMaxGroupPerTime };
}

/**
 * Get time delay to post all groups per time (in seconds)
 * @returns {Promise<number>} - seconds
 */
async function getTimeToPostOneGroup() {
  try {
    const timeDelay = await getTimeDelayInStorage();

    const totalTimeDelayPost =
      timeDelay.clickToPost +
      1 +
      timeDelay.fillContent +
      1 +
      timeDelay.fillFile +
      1 +
      timeDelay.openNewTab +
      1 +
      timeDelay.post +
      1;
    return totalTimeDelayPost + 4;
  } catch (error) {
    logActions("Error get time to post one groups: " + error);
  }
}

async function getTotalGroupsNeedPost() {
  try {
    const data = await getListGroupsNeedPostInStorage();
    const groupsNeedPost = data?.groups || [];
    const set = new Set();
    groupsNeedPost.forEach((group) => {
      const groups = group?.groups || [];
      groups.forEach((gr) => {
        set.add(gr.id_href);
      });
    });
    return set.size;
  } catch (error) {
    logError("Error get total groups need post: ", error);
  }
  return 0;
}

export {
  checkIsPostedAllGroup,
  resetPostedGroupAndSave,
  getGroupsMatch,
  getCurrentGroupNeedPost,
  getCurrentDataGroupSavedNeedPost,
  checkPostedAllGroupOrMaxGroupPerTime,
  getTimeToPostOneGroup,
  getTotalGroupsNeedPost,
};
