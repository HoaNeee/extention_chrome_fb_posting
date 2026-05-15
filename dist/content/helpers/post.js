import {
  KEY_IS_IN_PROGRESS,
  KEY_LAST_TIME_POST,
  SELECTOR_RAW,
  STATUS_TASK,
} from "../../contants/contants.js";
import {
  KEY_ADD_LOG,
  KEY_GET_CURRENT_DATA_GROUP_SAVED_NEED_POST,
  KEY_UPDATE_STATUS_TASK,
} from "../../contants/constant-extention.js";
import { initialTimeDelay } from "../../contants/contants.js";
import { sendMessage, sendMessageWithResponse } from "../utils/request.js";
import { CL_getIsTest, CL_getTimeDelayInStorage } from "../utils/storage.js";
import {
  logError,
  now,
  parseBase64ToFile,
  random,
  sleep,
} from "../../utils/utils.js";
import {
  findButtonPostAndClick,
  findDivInputTextbox,
  findDivToPost,
  getIsExistDialog,
} from "./dom.js";
import { CL_getValue, CL_setValue } from "../utils/utils.js";

/**
 * @param {string} content
 */
async function pasteContent(content) {
  try {
    const div = await findDivInputTextbox();
    if (div) {
      const mouseEvt = new MouseEvent("mouseover", {
        bubbles: true,
        cancelable: true,
      });

      await sleep(random(2, 5) * 100);

      div.dispatchEvent(mouseEvt);

      await sleep(random(2, 5) * 100);

      div.focus();

      let htmlContent = content || `<p></p>`;

      if (htmlContent.includes(`data-list="bullet"`)) {
        htmlContent = htmlContent.replaceAll(`ol`, `ul`);
      }

      const clipboardData = new DataTransfer();
      clipboardData.setData("text/html", htmlContent);

      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      });
      div.dispatchEvent(pasteEvent);
    }
  } catch (e) {
    sendMessage(KEY_ADD_LOG, {
      vi: `Lỗi khi dán nội dung vào ô nhập`,
      en: `Error when pasting content into the input box`,
    });
    throw new Error("Error at paste content: " + e);
  }
}

/**
 * @param {Array<{name: string, base64Data: string, type: string}>} files
 * @returns
 */
async function fillFile(files) {
  if (!files || !Array.isArray(files) || !files?.length) {
    return;
  }
  try {
    const div = document.querySelector(
      SELECTOR_RAW.toolbarLabel,
    )?.nextElementSibling;
    const input = div?.querySelector(SELECTOR_RAW.inputFiles);

    if (input) {
      const mouseEvt = new MouseEvent("mouseover", {
        bubbles: true,
        cancelable: true,
      });

      await sleep(random(2, 5) * 100);

      div.dispatchEvent(mouseEvt);

      await sleep(random(2, 5) * 100);

      //simulator change image event
      const dt = new DataTransfer();
      for (const file of files) {
        const parseFile = parseBase64ToFile(file);
        dt.items.add(parseFile);
      }
      input.files = dt.files;

      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } catch (e) {
    sendMessage(KEY_ADD_LOG, {
      vi: `Lỗi khi tải tệp lên ô nhập`,
      en: `Error when uploading files to the input box`,
    });
    throw new Error("Error at fill file: " + e);
  }
}

/**
 * @param {{id_href: string, status: string}} task
 * @returns
 */
async function postHelper(task) {
  try {
    const s = 1000;

    const isTest = await CL_getIsTest();

    const timeDelay = await CL_getTimeDelayInStorage();

    const timeClickToPost =
      timeDelay?.clickToPost || initialTimeDelay.clickToPost;
    const timeFillContent =
      timeDelay?.fillContent || initialTimeDelay.fillContent;
    const timeFillFile = timeDelay?.fillFile || initialTimeDelay.fillFile;
    const timePost = timeDelay?.post || initialTimeDelay.post;

    let delayClickToPost =
      random(
        Math.max(timeClickToPost - 1, 1),
        Math.max(timeClickToPost + 3, 3),
      ) * s;

    let delayFillContent =
      random(
        Math.max(timeFillContent - 1, 1),
        Math.max(timeFillContent + 3, 3),
      ) * s;

    let delayFillFile =
      random(Math.max(timeFillFile - 3, 1), Math.max(timeFillFile + 3, 3)) * s;

    let delayPost =
      random(Math.max(timePost - 1, 1), Math.max(timePost + 4, 3)) * s;

    if (isTest) {
      delayClickToPost = delayFillContent = delayFillFile = delayPost = s;
    }

    const responeDataContent = await sendMessageWithResponse(
      KEY_GET_CURRENT_DATA_GROUP_SAVED_NEED_POST,
    );
    const dataContent = responeDataContent.data;
    const contents = dataContent?.contents || [];

    const files = dataContent?.files || [];

    await sleep(delayClickToPost);

    const div = await findDivToPost();
    if (div) {
      const overEvt = new MouseEvent("mouseover", {
        bubbles: true,
        cancelable: true,
      });
      div.dispatchEvent(overEvt);
      await sleep(random(2, 4) * 100);

      div.click();

      //double check exist dialog, try 2 times
      await sleep(500);
      if (!getIsExistDialog()) {
        logError("Dialog not found, try again first time");

        sendMessage(KEY_ADD_LOG, {
          vi: "Ô nhập nội dung không tìm thấy, đang thử lại lần 1",
          en: "Content input box not found, try again first time",
        });

        const node = await findDivToPost();
        if (node) {
          node.click();
        }
        await sleep(random(1, 4) * 1000);
        if (!getIsExistDialog()) {
          logError("Dialog not found, try again second time");

          sendMessage(KEY_ADD_LOG, {
            vi: "Ô nhập nội dung không tìm thấy, đang thử lại lần 2",
            en: "Content input box not found, try again second time",
          });

          const node2 = await findDivToPost();
          if (node2) {
            const evt = new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
            });
            node2.dispatchEvent(evt);
          }
        }
      }

      await sleep(delayFillContent);
      task.status = STATUS_TASK.POSTING;
      sendMessage(KEY_UPDATE_STATUS_TASK, { status: task.status });

      //content
      let content = contents[random(0, contents.length - 1)];

      await pasteContent(content);

      //file
      await sleep(delayFillFile);
      fillFile(files);

      //post
      await sleep(delayPost);
      if (!isTest) {
        if (getIsExistDialog()) {
          const isProgress = CL_getValue(KEY_IS_IN_PROGRESS);
          if (isProgress) {
            await findButtonPostAndClick();
            CL_setValue(KEY_LAST_TIME_POST, now());
          }
        } else {
          logError("Dialog not found, can not post this group");

          sendMessage(KEY_ADD_LOG, {
            vi: "Ô nhập nội dung không tìm thấy, không thể đăng bài trong nhóm này",
            en: "Content input box not found, can not post this group",
          });
        }
      }

      //complete task
      task.status = STATUS_TASK.DONE;
      sendMessage(KEY_UPDATE_STATUS_TASK, { status: task.status });
      sendMessage(KEY_ADD_LOG, {
        vi: "Đã thực hiện xong việc đăng bài trong nhóm, chuyển sang nhóm tiếp theo.",
        en: "Done posting in this group, switch to next group.",
      });
    } else {
      logError("Cant not post in this group");
      sendMessage(KEY_ADD_LOG, {
        vi: `Không thể đăng bài trong nhóm này vì không tìm được thẻ click để tạo ô input`,
        en: `Can not post in this group because not found button to create input tag`,
      });
      task.status = STATUS_TASK.ERROR;
      sendMessage(KEY_UPDATE_STATUS_TASK, { status: task.status });
    }
  } catch (error) {
    sendMessage(KEY_ADD_LOG, {
      vi: `Lỗi khi đăng bài trong nhóm này ${error}`,
      en: `Error when posting in this group ${error}`,
    });
    task.status = STATUS_TASK.ERROR;
    sendMessage(KEY_UPDATE_STATUS_TASK, { status: task.status });
    logError("Error at postHelper: " + error);
  }
}

export { pasteContent, fillFile, postHelper };
