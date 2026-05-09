import {
  KEY_CLEAR_NOTIFICATION,
  KEY_CLOSE_THIS_TAB,
  KEY_GET_CURRENT_DATA_GROUP_SAVED_NEED_POST,
  KEY_GET_LIST_GROUPS,
  KEY_NEXT_POST_GROUP,
  KEY_NOTIFICATION,
  KEY_OPEN_IN_TAB,
  KEY_REGISTER_MENU_COMMAND,
  KEY_SCHEDULER_ALARMS,
  KEY_UNREGISTER_MENU_COMMAND,
  KEY_UPDATE_IS_SPAMMED,
  KEY_UPDATE_STATUS_TASK,
  KEY_XMLHTTP_REQUEST,
  STATUS_RESPONSE,
} from "./contants/constant-extention.js";
import {
  KEY_CAN_POST_THIS_TAB,
  KEY_IS_SCROLL_DETECT_LIST_GROUP,
  KEY_IS_SHUFFLE_SCHEDULER_TIME,
  KEY_IS_SPAMMED,
  KEY_TAB,
  STATUS_TASK,
  URL_LIST_GROUPS,
} from "./contants/contants.js";
import {
  checkPostedAllGroupOrMaxGroupPerTime,
  getCurrentDataGroupSavedNeedPost,
  getCurrentGroupNeedPost,
  resetPostedGroupAndSave,
} from "./dashboard/src/helpers/group.js";
import { shuffleTimes } from "./dashboard/src/helpers/scheduler.js";
import {
  getCurrentIndexGroupPost,
  getIsStealFocusInStorage,
  getIsStopTaskInStorage,
  getRandomIndexGroupChecked,
  setCurrentIndexGroupPost,
} from "./dashboard/src/helpers/storage.js";
import { automationContinue } from "./dashboard/src/services/automation-service.js";
import {
  getAllGroupPostedsInStorage,
  getListGroupsNeedPostInStorage,
} from "./dashboard/src/services/groupService.js";
import {
  clearAndCreateSchedulerAlarm,
  clearSchedulerAuto,
  createSchedulerAuto,
  getSchedulerService,
} from "./dashboard/src/services/scheduler-service.js";
import { DB_openInTab } from "./dashboard/src/utils/api-helper.js";
import {
  BG_deleteValue,
  BG_getValue,
  BG_setValue,
  getProgressTool,
  getTask,
  saveTask,
  setCurrentPostLength,
  setProgressTool,
  setStatusTask,
} from "./utils/bgr-storage.js";
import {
  getIsDashboardTab,
  logActions,
  logError,
  now,
  sleep,
} from "./utils/utils.js";

//KEY TEST, DELETE AFTER FINISH
const KEY_COUNT_TRIGGER_TEST = "count triggered";
const KEY_OPEN_DASHBOARD = "OPEN_DASHBOARD";

//ALARMS
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === KEY_SCHEDULER_ALARMS) {
    try {
      BG_setValue(KEY_IS_SPAMMED, false);
      const tabs = await chrome.tabs.query({});
      const isProgress = await getProgressTool();

      let isOpenningDashboardTab = false;
      for (const tab of tabs) {
        const url = tab.url;
        if (getIsDashboardTab(url)) {
          isOpenningDashboardTab = true;
          break;
        }
      }
      if (!isOpenningDashboardTab || isProgress) {
        if (isProgress) {
          setProgressTool(false);
        }
        clearSchedulerAuto();
        return;
      }
      logActions("Its time to post");
      await automationContinue();
      const isShuffle =
        (await BG_getValue(KEY_IS_SHUFFLE_SCHEDULER_TIME)) || false;
      if (isShuffle) {
        shuffleTimes();
      }
    } catch (error) {
      logError("Error at alarm: ", error);
    }
  }
});

//EVENT: tab remove
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // console.log("Tab remove id: " + tabId);
  const tabIdGetListGroup = await BG_getValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
  if (tabId === tabIdGetListGroup) {
    BG_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, false);
    BG_deleteValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
  }

  //check when posting was be close
  const tabIdPost = await BG_getValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
  if (tabId === tabIdPost) {
    setProgressTool(false);
    BG_deleteValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
  }

  const tabIdDashboard = await BG_getValue(KEY_TAB.TAB_DASHBOARD_ID);
  if (tabId === tabIdDashboard) {
    clearSchedulerAuto();
    BG_deleteValue(KEY_TAB.TAB_DASHBOARD_ID);
  }
});

//EVENT: reload not create tab
chrome.webNavigation.onCommitted.addListener(async (details) => {
  //check get list groups tab was be reload -> set
  const tabIdGetListGroup = await BG_getValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
  const tabIdPost = await BG_getValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
  if (details.frameId === 0) {
    const currentId = details.tabId;

    //check get list groups tab was be reload
    if (currentId === tabIdGetListGroup) {
      if (details.transitionType === "reload") {
        console.log("[FB Auto Post] Tab get list groups reloaded");
        BG_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, false);
        BG_deleteValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
      }
    }

    //check when posting was be reload -> set
    if (currentId === tabIdPost) {
      if (details.transitionType === "reload") {
        setProgressTool(false);
        BG_deleteValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
      }
    }

    const url = details.url || "";
    if (getIsDashboardTab(url) && details.transitionType !== "reload") {
      BG_setValue(KEY_TAB.TAB_DASHBOARD_ID, currentId);
    }
  }
});

// chrome.storage.onChanged.addListener(async (changes, areaName) => {
//   console.log("Changes: ", changes);
//   console.log("Area name: ", areaName);
// });

// ============================================================
// MESSAGE ROUTER: Listens for messages from content scripts
// ============================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    switch (msg.type) {
      // --- GM_notification ---
      case KEY_NOTIFICATION:
        chrome.notifications.create(msg.id, {
          type: "basic",
          iconUrl: msg.iconUrl || "icons/icon-128.png",
          title: msg.title || "FB Auto Post",
          message: msg.message || "",
        });
        break;

      case KEY_CLEAR_NOTIFICATION:
        chrome.notifications.clear(msg.id);
        break;

      // --- GM_openInTab ---
      case KEY_OPEN_IN_TAB:
        handleOpenInTab(msg);
        break;

      // --- GM_registerMenuCommand ---
      case KEY_REGISTER_MENU_COMMAND:
        chrome.contextMenus.create({
          id: msg.id,
          title: msg.title,
          contexts: ["page"],
          documentUrlPatterns: ["https://www.facebook.com/*"],
        });
        break;

      case KEY_UNREGISTER_MENU_COMMAND:
        chrome.contextMenus.remove(msg.id).catch(() => {});
        break;

      // --- GM_xmlhttpRequest (CORS bypass via background fetch) ---
      case KEY_XMLHTTP_REQUEST:
        handleXHR(msg, sender);
        break;

      //CLOSE THIS TAB
      case KEY_CLOSE_THIS_TAB:
        try {
          chrome.tabs.remove(sender.tab.id);
        } catch (error) {
          logError("Error close this tab: ", error);
        }
        break;

      case KEY_GET_LIST_GROUPS:
        handleGetListGroups();
        break;

      case KEY_CAN_POST_THIS_TAB:
        handleCanPostThisTab(sender, sendResponse);
        return true;

      case KEY_OPEN_DASHBOARD:
        handleOpenDashboard();
        break;

      case KEY_UPDATE_STATUS_TASK:
        setStatusTask(msg.data.status);
        break;

      case KEY_GET_CURRENT_DATA_GROUP_SAVED_NEED_POST:
        handleGetCurrentDataGroupSavedNeedPost(sendResponse);
        return true;

      case KEY_NEXT_POST_GROUP:
        nextGroupPost();
        break;

      case KEY_UPDATE_IS_SPAMMED:
        handleUpdateIsSpammed(msg.data.isSpammed);
        break;
    }
  } catch (error) {
    logError("Error at background: ", error);
    sendResponse({
      status: STATUS_RESPONSE.FAIL,
      message: error.message || error || "Something went wrong",
    });
    return true;
  }
});

async function nextGroupPost() {
  try {
    const isStop = await getIsStopTaskInStorage();
    const isSpammed = (await BG_getValue(KEY_IS_SPAMMED)) || false;
    const isProgress = await getProgressTool();

    if (isStop || isSpammed || !isProgress) {
      setProgressTool(false);
      return;
    }
    const { isPostedAll, isPostedMaxGroupPerTime } =
      await checkPostedAllGroupOrMaxGroupPerTime();

    if (isPostedAll || isPostedMaxGroupPerTime) {
      setCurrentPostLength(0);
      setProgressTool(false);

      if (isPostedAll) {
        logActions("[Background] All group have been posted");
        await resetPostedGroupAndSave();
      } else {
        logActions("[Background] Max group per time have been posted");
      }

      const scheduler = await getSchedulerService();
      if (scheduler.isScheduler) {
        clearAndCreateSchedulerAlarm();
      }
      return;
    }

    const objectList = await getListGroupsNeedPostInStorage();
    let currentIndexGroup = await getCurrentIndexGroupPost();

    if (!currentIndexGroup) {
      logActions("No group need post, change other group");
      setProgressTool(false);
      return;
    }

    const listGroups = objectList?.groups || [];
    const need = listGroups.find((gr) => gr.id === currentIndexGroup);

    if (!need || !need.groups || !need.groups.length) {
      logActions("No group need post");
      setProgressTool(false);
      return;
    }
    const posteds = await getAllGroupPostedsInStorage();
    const set = new Set(posteds);

    let groups = need?.groups || [];

    //continue task
    const isExistGroupPending = groups.some(
      (gr) => !set.has(gr.id_href) && gr.status === STATUS_TASK.PENDING,
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
      return gr.status === STATUS_TASK.PENDING && !set.has(gr.id_href);
    });

    if (nextTaskFind) {
      logActions("open next task: ", nextTaskFind);
      saveTask({ task: nextTaskFind, time: now() });
      const isFixStealFocus = await getIsStealFocusInStorage();
      if (isFixStealFocus) {
        const tabId = await DB_openInTab(nextTaskFind.id_href, {
          active: false,
        });
        await BG_setValue(KEY_TAB.LAST_POST_TAB_OPEN_ID, tabId);
        setTimeout(() => {
          chrome.tabs.update(tabId, { active: true });
        }, 4000);
      } else {
        const tabId = await DB_openInTab(nextTaskFind.id_href, {
          active: true,
        });
        await BG_setValue(KEY_TAB.LAST_POST_TAB_OPEN_ID, tabId);
      }
    }
    //not found next task
    else {
      setProgressTool(false);
      logActions("No next task, maybe posted all in current group");
    }
  } catch (error) {
    setProgressTool(false);
    logError("Error at next group post: ", error);
  }
}

//handle can post this tab
async function handleCanPostThisTab(sender, sendResponse) {
  try {
    const lastTabPostId = await BG_getValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
    const taskObject = await getTask();
    const task = taskObject?.task;

    if (lastTabPostId === sender.tab.id) {
      setStatusTask(STATUS_TASK.SELECTING);
      sendResponse({
        status: STATUS_RESPONSE.SUCCESS,
        data: {
          canPost: true,
          task,
        },
      });
      return true;
    }
    sendResponse({
      status: STATUS_RESPONSE.FAIL,
      message:
        "Can not post this tab, because this tab maybe open by user, not by tool",
    });
    return true;
  } catch (error) {
    logError("Error can post this tab: ", error);
  }
}

async function handleOpenInTab(msg) {
  try {
    const t = await chrome.tabs.create({
      url: msg.url,
      active: msg.active !== false,
    });
    await BG_setValue(KEY_TAB.LAST_POST_TAB_OPEN_ID, t.id);
  } catch (error) {
    logError("Error open in tab: ", error);
  }
}

async function handleGetListGroups() {
  try {
    await BG_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, true);
    const tab = await chrome.tabs.create({
      url: URL_LIST_GROUPS,
      active: true,
    });
    await BG_setValue(KEY_TAB.TAB_GET_LIST_GROUP_ID, tab.id);
  } catch (error) {
    logError("Error get list groups: ", error);
  }
}

async function handleOpenDashboard() {
  const urlDashboard = chrome.runtime.getURL("dashboard/dashboard.html");
  const tabs = await chrome.tabs.query({ url: urlDashboard });
  if (tabs && tabs?.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
  } else {
    chrome.tabs.create({
      url: urlDashboard,
      active: true,
    });
  }
}

async function handleGetCurrentDataGroupSavedNeedPost(sendResponse) {
  try {
    const isProgress = await getProgressTool();
    if (!isProgress) {
      sendResponse({
        status: STATUS_RESPONSE.FAIL,
        message: "Tool is not running",
      });
      return true;
    }
    const data = await getCurrentDataGroupSavedNeedPost();
    const contents = data?.contents || [];

    if (!contents.length) {
      sendResponse({
        status: STATUS_RESPONSE.FAIL,
        message: "No content to post",
      });
      return true;
    }

    sendResponse({
      status: STATUS_RESPONSE.SUCCESS,
      data: data,
    });
  } catch (error) {
    logError("Error get current data group saved need post: ", error);
  }
}

async function handleUpdateIsSpammed(isSpammed) {
  try {
    BG_setValue(KEY_IS_SPAMMED, isSpammed);
    if (isSpammed) {
      setProgressTool(false);
      logActions("User is spammed, stop task");
      const scheduler = await getSchedulerService();
      if (scheduler.isScheduler) {
        clearSchedulerAuto();
        const nextTime = now() + 1000 * 60 * 60 * 24 * 2; // 2 day
        setTimeout(() => {
          createSchedulerAuto(nextTime);
        }, 10000);
      }
    }
  } catch (error) {
    logError("Error update is spammed: ", error);
  }
}

// ============================================================
// XHR HANDLER: Proxies fetch requests from content scripts
// ============================================================

async function handleXHR(msg, sender) {
  try {
    const fetchOptions = {
      method: msg.method || "GET",
      headers: msg.headers || {},
    };

    if (msg.data && msg.method !== "GET" && msg.method !== "HEAD") {
      fetchOptions.body = msg.data;
    }

    const response = await fetch(msg.url, fetchOptions);
    const responseText = await response.text();

    // Build response headers string
    const headers = [];
    response.headers.forEach((value, key) => {
      headers.push(`${key}: ${value}`);
    });

    // Send response back to content script
    chrome.tabs.sendMessage(sender.tab.id, {
      type: "GM_xmlhttpRequest_response",
      requestId: msg.requestId,
      status: response.status,
      statusText: response.statusText,
      responseText: responseText,
      responseHeaders: headers.join("\r\n"),
      finalUrl: response.url,
    });
  } catch (e) {
    chrome.tabs.sendMessage(sender.tab.id, {
      type: "GM_xmlhttpRequest_response",
      requestId: msg.requestId,
      error: e.message,
    });
  }
}

console.log("[FB Auto Post] Background service worker started");
