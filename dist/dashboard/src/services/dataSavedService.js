import {
  KEY_DATA_POST_SAVED,
  KEY_INDEXS_GROUP_CHECKED,
} from "../../../contants/contants.js";
import { DB_getValue } from "../utils/api-helper.js";
import { DataSavedDB } from "../utils/dataSavedDB.js";
import { logError } from "../../../utils/utils.js";

/**
 * @param {Array<{id: string, title: string, name: string, contents: string[], files: Blob[], priority: number}>} data array of data saved in storage
 * @returns no return
 */
async function setDataSavedInStorage(data) {
  try {
    const db = new DataSavedDB(KEY_DATA_POST_SAVED);
    await db.saveDataPosts(data);
  } catch (error) {
    logError("Error setDataSaved: " + error);
    throw new Error("Error setDataSaved: " + error);
  }
}

/**
 * @returns {Promise<Array<{id: string, title: string, name: string, contents: string[], files: Blob[], priority: number}>>} array of data saved in storage, if not exist return empty array
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
 * Get all groups that need to be posted from saved data (group to be checked)
 * @returns {Promise<Array<{id: string, title: string, name: string, contents: string[], files: Blob[], priority: number}>>} all groups that need to be posted from saved data (group to be checked)
 */
async function getDataGroupsSavedNeedPost() {
  try {
    const dataSaveds = (await getDataSavedInStorage()) || [];
    const indexsChecked = (await DB_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];
    const list = [];

    for (const data of dataSaveds) {
      const id = data.id;
      if (indexsChecked.includes(id)) {
        list.push(data);
      }
    }

    return list;
  } catch (error) {
    logError("Error getDataGroupsSavedNeedPost: " + error);
    throw new Error("Error getDataGroupsSavedNeedPost: " + error);
  }
}

export {
  setDataSavedInStorage,
  getDataSavedInStorage,
  getDataGroupsSavedNeedPost,
};
