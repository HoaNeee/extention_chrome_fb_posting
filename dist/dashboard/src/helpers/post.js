import {
  KEY_IS_TEST,
  KEY_LAST_TIME_POST,
  KEY_POST,
  KEY_POST_LENGTH,
} from "../../../contants/contants.js";
import { showNotify } from "../draw_element/notify.js";
import {
  logActions,
  logError,
  now,
  parseBase64ToFile,
  random,
  sleep,
} from "../utils/utils.js";
import {
  findButtonPostAndClick,
  findDivInputTextbox,
  findDivToPost,
  getIsExistDialog,
} from "./elementDom.js";
import {
  checkPostedAllGroupOrMaxGroupPerTime,
  getCurrentDataGroupSavedNeedPost,
  getCurrentGroupNeedPost,
  resetPostedGroupAndSave,
} from "./group.js";
import {
  getAllGroupPostedsInStorage,
  getCurrentIndexGroupPost,
  getIsStealFocusInStorage,
  getListGroupsNeedPostInStorage,
  getRandomIndexGroupChecked,
  getTimeDelayInStorage,
  setCurrentIndexGroupPost,
  setProgress,
} from "./storage.js";

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
    const div = document.querySelector("div#toolbarLabel")?.nextElementSibling;
    const input = div?.querySelector(`input[accept][multiple][type="file"]`);

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
    throw new Error("Error at fill file: " + e);
  }
}

/**
 * @param {{id_href: string, status: string}} task
 * @returns
 */
async function postHelper(task) {
  try {
    //check posted
    const posteds = await getAllGroupPostedsInStorage();
    if (posteds.includes(task.id_href)) {
      logActions("Group already posted");
      return;
    }

    const s = 1000;
    const currentLength = (await GM_getValue(KEY_POST_LENGTH)) || 0;

    const isTest = (await GM_getValue(KEY_IS_TEST)) || false;

    const timeDelay = await getTimeDelayInStorage();

    const timeClickToPost = timeDelay?.clickToPost || 5;
    const timeFillContent = timeDelay?.fillContent || 5;
    const timeFillFile = timeDelay?.fillFile || 9;
    const timePost = timeDelay?.post || 6;

    let delayClickToPost =
      random(
        Math.max(timeClickToPost - 1, 1),
        Math.max(timeClickToPost + 3, 4),
      ) * s;

    let delayFillContent =
      random(
        Math.max(timeFillContent - 1, 1),
        Math.max(timeFillContent + 3, 4),
      ) * s;

    let delayFillFile =
      random(Math.max(timeFillFile - 3, 1), Math.max(timeFillFile + 3, 5)) * s;

    let delayPost =
      random(Math.max(timePost - 1, 1), Math.max(timePost + 4, 5)) * s;

    if (isTest) {
      delayClickToPost = delayFillContent = delayFillFile = delayPost = s;
    }

    const dataContent = await getCurrentDataGroupSavedNeedPost();
    const contents = dataContent?.contents || [];

    if (!contents.length) {
      showNotify({
        message: "No content to post",
        type: "error",
      });
      logActions("No content to post");
      setProgress(false);
      return;
    }
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
        const node = await findDivToPost();
        if (node) {
          node.click();
        }
        await sleep(500);
        if (!getIsExistDialog()) {
          logError("Dialog not found, try again second time");
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
      task.status = "posting";
      GM_setValue(KEY_POST, { task, time: now() });

      //content
      let content = contents[random(0, contents.length - 1)];
      //MAYBE NEED FIX HERE BECAUSE IT IS EDITOR -> HTML -> ALWAYS HAVE CONTENT (<p>...</p>)
      if (!content.trim()) {
        for (const ct of contents) {
          if (ct.trim()) {
            content = ct;
            break;
          }
        }
      }
      await pasteContent(content);

      //file
      await sleep(delayFillFile);
      fillFile(files);

      //post
      await sleep(delayPost);
      if (!isTest) {
        if (getIsExistDialog()) {
          await findButtonPostAndClick();
          GM_setValue(KEY_LAST_TIME_POST, now());
        } else {
          logError("Dialog not found, can not post this group");
        }
      }

      GM_setValue(KEY_POST_LENGTH, currentLength + 1);

      //complete task
    } else {
      logError("Cant not post in this group");
    }

    task.status = "done";
    GM_setValue(KEY_POST, { task, time: now() });
  } catch (error) {
    logError("Error at postHelper: " + error);
    throw new Error("Error at postHelper: " + error);
  }
}

/**
 * @param {{id_href: string, status: string}} currentTask
 * @returns
 */
async function nextTask(currentTask) {
  try {
    const { isPostedAll, isPostedMaxGroupPerTime } =
      await checkPostedAllGroupOrMaxGroupPerTime();
    if (isPostedAll || isPostedMaxGroupPerTime) {
      GM_setValue(KEY_POST_LENGTH, 0);
      setProgress(false);
      if (isPostedAll) {
        logActions("All group posted");
        await resetPostedGroupAndSave();
      } else {
        logActions("Max group per time");
      }
      return;
    }

    const objectList = await getListGroupsNeedPostInStorage();
    let currentIndexGroup = await getCurrentIndexGroupPost();

    if (!currentIndexGroup) {
      logActions("No group need post, change other group");
      setProgress(false);
      return;
    }

    const listGroups = objectList?.groups || [];
    const need = listGroups.find((gr) => gr.id === currentIndexGroup);

    if (!need || !need.groups || !need.groups.length) {
      logActions("No group need post");
      setProgress(false);
      return;
    }
    const posteds = await getAllGroupPostedsInStorage();
    const set = new Set(posteds);

    let groups = need?.groups || [];

    //continue task
    const isExistGroupPending = groups.some(
      (gr) => !set.has(gr.id_href) && gr.status === "pending",
    );

    if (!isExistGroupPending) {
      let id = await getRandomIndexGroupChecked();
      if (!id) {
        logActions("All group posted");
        await resetPostedGroupAndSave();
        id = await getRandomIndexGroupChecked();
      }
      setCurrentIndexGroupPost(id);
      const need = await getCurrentGroupNeedPost();
      groups = need?.groups || [];
    }

    const nextTaskFind = groups.find((gr) => {
      return gr.status === "pending" && !set.has(gr.id_href);
    });

    logActions("open next task");

    if (nextTaskFind) {
      await openNewTask({ task: nextTaskFind, isDelay: true });
    }
    //not found next task
    else {
      setProgress(false);
      logActions("No next task, maybe posted all in current group");
    }
  } catch (e) {
    setProgress(false);
    logError("Error at nextTask: " + e);
    throw new Error("Error at nextTask: " + e);
  }
}

/**
 * @param {{task: {id_href: string, status: string}, isDelay: boolean}|null} taskObject
 * @returns none
 */
async function openNewTask(taskObject = {}) {
  try {
    const task = taskObject.task;
    const timeDelay = await getTimeDelayInStorage();
    const timeWaitToOpenNewTab = timeDelay?.openNewTab || 2;
    const delayOpenNewTab =
      timeWaitToOpenNewTab % 2 === 0
        ? (timeWaitToOpenNewTab / 2) * 1000
        : ((timeWaitToOpenNewTab + 1) / 2) * 1000;

    const isDelay =
      taskObject.isDelay !== undefined ? taskObject.isDelay : true;

    if (isDelay) {
      await sleep(delayOpenNewTab);
    }

    GM_setValue(KEY_POST, { task, time: now() });

    if (isDelay) {
      await sleep(delayOpenNewTab);
    }

    const isFixStealFocus = await getIsStealFocusInStorage();

    if (isFixStealFocus) {
      GM_openInTab(task.id_href, { active: false, insert: true });
    } else {
      GM_openInTab(task.id_href, { active: true, insert: true });
    }
  } catch (error) {
    logError("Error at openNewTask: " + error);
    throw new Error("Error at openNewTask: " + error);
  }
}

export { pasteContent, fillFile, postHelper, nextTask, openNewTask };
