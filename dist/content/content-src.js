import {
  KEY_CLOSE_THIS_TAB,
  KEY_NEXT_POST_GROUP,
} from "../contants/constant-extention.js";
import {
  KEY_ALL_GROUPS,
  URL_LIST_GROUPS,
  KEY_CAN_POST_THIS_TAB,
  KEY_IS_SCROLL_DETECT_LIST_GROUP,
  KEY_POST,
  KEY_IS_TEST,
} from "../contants/contants.js";
import { logError, random, sleep } from "../utils/utils.js";
import { notificationContainer, showNotify } from "./elements/notify.js";
import { clickOutSideHideDialog, getIsExistDialog } from "./helpers/dom.js";
import { getListGroups } from "./helpers/groups.js";
import { postHelper } from "./helpers/post.js";
import { sendMessage, sendMessageWithResponse } from "./utils/request.js";
import {
  CL_getProgressTool,
  CL_getTimeDelayInStorage,
} from "./utils/storage.js";
import { CL_getValue, CL_setValue, getIsMatchUrl } from "./utils/utils.js";

async function main() {
  console.log("content script is running...");
  try {
    notificationContainer({});

    //GET LIST GROUPS
    if (getIsMatchUrl(URL_LIST_GROUPS)) {
      const isGetList = await CL_getValue(KEY_IS_SCROLL_DETECT_LIST_GROUP);
      if (isGetList) {
        console.log("GET LIST GROUP");
        await sleep(4000);
        const allGroups = await getListGroups();
        CL_setValue(KEY_ALL_GROUPS, allGroups);
        await sleep(2000);
        sendMessage(KEY_CLOSE_THIS_TAB, {});
      }
      return;
    }

    //POSTING AUTO
    try {
      const isProgress = await CL_getProgressTool();
      if (!isProgress) {
        return;
      }
      const responeCanPost = await sendMessageWithResponse(
        KEY_CAN_POST_THIS_TAB,
      );
      console.log("Respone can post", responeCanPost);

      const canPost = responeCanPost.data.canPost;
      const task = responeCanPost.data.task;

      if (canPost) {
        await postHelper(task);

        const timeDelay = await CL_getTimeDelayInStorage();
        const timeDelayNext =
          timeDelay.openNewTab % 2 === 0
            ? timeDelay.openNewTab / 2
            : (timeDelay.openNewTab + 1) / 2;

        await sleep(timeDelayNext * 1000);
        sendMessage(KEY_NEXT_POST_GROUP, {});
        const isTest = await CL_getValue(KEY_IS_TEST, false);
        if (isTest) {
          setTimeout(() => {
            sendMessage(KEY_CLOSE_THIS_TAB, {});
          }, 15 * 1000);
        } else {
          setTimeout(
            () => {
              sendMessage(KEY_CLOSE_THIS_TAB, {});
            },
            random(35, 55) * 1000,
          );

          setTimeout(
            () => {
              if (getIsExistDialog()) {
                clickOutSideHideDialog();
              }
            },
            random(10, 20) * 1000,
          );
        }
      }
    } catch (error) {
      // logError("Error at content main: ", error);
    }
  } catch (error) {
    logError("Error at content main: ", error);
  }
}

main();
