import {
  KEY_ADD_LOG,
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
  KEY_NEXT_TIME_POST_WHEN_SPAMMED,
  KEY_TAB,
  STATUS_TASK,
  URL_LIST_GROUPS,
} from "./contants/contants.js";
import { addLog } from "./dashboard/src/draw_element/panel-log.js";
import {
  checkPostedAllGroupOrMaxGroupPerTime,
  getCurrentDataGroupSavedNeedPost,
  getCurrentGroupNeedPost,
  resetPostedGroupAndSave,
} from "./dashboard/src/helpers/group.js";
import {
  getCorrectNextTime,
  getNextTimePost,
  shuffleTimes,
} from "./dashboard/src/helpers/scheduler.js";
import {
  getCurrentIndexGroupPost,
  getIsFixStealAllFocusInStorage,
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
  getSchedulerService,
} from "./dashboard/src/services/scheduler-service.js";
import { DB_openInTab } from "./dashboard/src/utils/api-helper.js";
import {
  BG_deleteValue,
  BG_getValue,
  BG_setValue,
  getCountPost,
  getProgressTool,
  getTask,
  saveTask,
  setCountPost,
  setCurrentPostLength,
  setProgressTool,
  setStatusTask,
} from "./utils/bgr-storage.js";
import {
  getIsDashboardTab,
  logActions,
  logError,
  now,
  random,
} from "./utils/utils.js";

//KEY TEST, DELETE AFTER FINISH
const KEY_COUNT_TRIGGER_TEST = "count triggered";
const KEY_OPEN_DASHBOARD = "OPEN_DASHBOARD";

//ALARMS
chrome.alarms.onAlarm.addListener((alarm) => {
  handleOnAlarm(alarm);
});

//EVENT: tab remove
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  handleOnRemove(tabId);
});

//EVENT: reload not create tab
chrome.webNavigation.onCommitted.addListener((details) => {
  handleOnCommited(details);
});

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
        handleCloseThisTab(sender);
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
      case KEY_ADD_LOG:
        handleAddLog(msg.data);
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
        addLog({
          vi: "Tất cả nhóm đã được đăng, đặt lại tất cả nhóm thành đang chờ",
          en: "All group have been posted, reset all group to pending",
        });
        await resetPostedGroupAndSave();
      } else {
        const countPost = await getCountPost();
        setCountPost(countPost + 1);
        logActions("[Background] Max group per time have been posted");
        addLog({
          vi: "Số lượng nhóm đã đăng đạt giới hạn, chuyển sang đợt tiếp theo",
          en: "Max group per time have been posted, switch to next batch",
        });
      }

      const scheduler = await getSchedulerService();
      if (scheduler.isScheduler) {
        clearAndCreateSchedulerAlarm();
        const nextTime = await getNextTimePost();
        const date = new Date(nextTime);
        addLog({
          vi: `Thời gian đăng bài tiếp theo trong bộ lịch: ${date.toLocaleString()}`,
          en: `Next time for next post in the scheduler: ${date.toLocaleString()}`,
        });
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
      const isFixStealAllFocus = await getIsFixStealAllFocusInStorage();
      if (isFixStealAllFocus) {
        const tabId = await DB_openInTab(nextTaskFind.id_href, {
          active: false,
        });
        await BG_setValue(KEY_TAB.LAST_POST_TAB_OPEN_ID, tabId);
      } else if (isFixStealFocus) {
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
  const urlDashboard = chrome.runtime.getURL(
    "dashboard/dashboard.html#nav=dashboard",
  );
  const tabs = await chrome.tabs.query({});
  if (tabs && Array.isArray(tabs) && tabs?.length > 0) {
    for (const tab of tabs) {
      const url = tab.url;
      if (url.includes("dashboard")) {
        chrome.tabs.update(tab.id, { active: true });
        return;
      }
    }
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
    if (isSpammed) {
      await addLog({
        vi: "Tài khoản bị spam, tạm dừng tool",
        en: "Account is spammed, stop task",
      });
      setProgressTool(false);
      const nextTime = now() + 1000 * 60 * 60 * 24 * 2; // 2 day
      BG_setValue(KEY_NEXT_TIME_POST_WHEN_SPAMMED, nextTime);
      BG_setValue(KEY_IS_SPAMMED, isSpammed);
    }
  } catch (error) {
    logError("Error update is spammed: ", error);
  }
}

async function handleAddLog(message) {
  try {
    addLog({ vi: message?.vi || "", en: message?.en || "" });
  } catch (error) {
    logError("Error add log: ", error);
  }
}

async function handleWelcomeBack() {
  try {
    addLog({
      vi: "Chào mừng bạn quay trở lại",
      en: "Welcome back",
    });
    const isProgress = await getProgressTool();
    if (!isProgress) {
      const scheduler = await getSchedulerService();
      if (scheduler.isScheduler) {
        const nextTime = await getCorrectNextTime();
        const date = new Date(nextTime);
        addLog({
          vi:
            "Lịch trình tự động đang được bật, thời gian thực hiện tiếp theo: " +
            date.toLocaleString(),
          en:
            "Auto schedule is enabled, the next execution time: " +
            date.toLocaleString(),
        });
      }
    } else {
      addLog({
        vi: "Tiện ích đang trong quá trình chạy, hãy cố gắng đừng đóng tab này",
        en: "Tool is running, please try not to close this tab",
      });
    }
  } catch (error) {
    logError("Error at handleWelcomeBack method: ", error);
  }
}

async function handleCloseThisTab(sender) {
  try {
    chrome.tabs.query({}, function (tabs) {
      const id = sender.tab.id;
      if (tabs && Array.isArray(tabs) && tabs.find((t) => t.id === id)) {
        chrome.tabs.remove(id);
      }
    });
  } catch (error) {
    logError("Error handle close this tab: ", error);
  }
}

async function handleOnCommited(details) {
  try {
    if (details.frameId === 0) {
      const currentId = details.tabId;

      if (details.transitionType === "reload") {
        const tabIdGetListGroup = await BG_getValue(
          KEY_TAB.TAB_GET_LIST_GROUP_ID,
        );
        //check get list groups tab was be reload
        if (currentId === tabIdGetListGroup) {
          const isScroll = await BG_getValue(KEY_IS_SCROLL_DETECT_LIST_GROUP);
          if (isScroll) {
            BG_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, false);
            BG_deleteValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
            addLog({
              vi: "Đã dừng lấy danh sách nhóm do tab bị load lại thủ công",
              en: "Stopped getting group list because tab was reloaded manually",
            });
          }
        }

        const tabIdPost = await BG_getValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
        //check when posting was be reload -> set
        if (currentId === tabIdPost) {
          setProgressTool(false);
          BG_deleteValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
          addLog({
            vi: "Đã dừng đăng bài đợt này do tab bị load lại thủ công",
            en: "Stopped posting this batch because tab was reloaded manually",
          });
        }
      }

      if (details.transitionType !== "reload") {
        const url = details.url || "";

        //when user open dashboard tab -> set tab id, not exist dashboard tab and reload it
        if (getIsDashboardTab(url)) {
          handleWelcomeBack();
          BG_setValue(KEY_TAB.TAB_DASHBOARD_ID, currentId);
        }
      }
    }
  } catch (error) {
    logError("Error at handleOnCommited method: ", error);
  }
}

async function handleOnRemove(tabId) {
  try {
    const tabIdGetListGroup = await BG_getValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
    if (tabId === tabIdGetListGroup) {
      const isScroll = await BG_getValue(KEY_IS_SCROLL_DETECT_LIST_GROUP);
      if (isScroll) {
        BG_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, false);
        BG_deleteValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
        addLog({
          vi: "Đã dừng lấy danh sách nhóm do tab bị đóng thủ công",
          en: "Stopped getting group list because tab was closed manually",
        });
      }
    }

    //check when posting was be close
    const tabIdPost = await BG_getValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
    if (tabId === tabIdPost) {
      const isProgress = await getProgressTool();
      if (isProgress) {
        setProgressTool(false);
        BG_deleteValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
        addLog({
          vi: "Đã dừng đăng bài đợt này do tab bị đóng thủ công",
          en: "Stopped posting this batch because tab was closed manually",
        });
      }
    }

    const tabIdDashboard = await BG_getValue(KEY_TAB.TAB_DASHBOARD_ID);
    if (tabId === tabIdDashboard) {
      clearSchedulerAuto();
      BG_deleteValue(KEY_TAB.TAB_DASHBOARD_ID);
    }
  } catch (error) {
    logError("Error at handleRemove", error);
  }
}

async function handleOnAlarm(alarm) {
  try {
    if (alarm.name === KEY_SCHEDULER_ALARMS) {
      const tabs = await chrome.tabs.query({});

      let isOpenningDashboardTab = false;
      for (const tab of tabs) {
        const url = tab.url;
        if (getIsDashboardTab(url)) {
          isOpenningDashboardTab = true;
          break;
        }
      }
      const isProgress = await getProgressTool();
      if (!isOpenningDashboardTab || isProgress) {
        if (isProgress) {
          setProgressTool(false);
        }
        clearSchedulerAuto();
        return;
      }
      logActions("Its time to post, random post this time or not");

      addLog({
        vi: "Đã đến giờ đăng bài trong lịch trình, đang tính toán có nên đăng bài đợt này không",
        en: "It's time to post in the schedule, calculating whether to post this batch or not",
      });

      function sleepThisTime() {
        addLog({
          vi: "Đã quyết định nghỉ đợt đăng bài lần này, chuyển sang đợt tiếp theo",
          en: "Decided to skip this batch, will start next batch",
        });
        setProgressTool(false);
        setCountPost(0);
        clearAndCreateSchedulerAlarm();
      }

      const countPost = await getCountPost();
      if (countPost > 7) {
        sleepThisTime();
        return;
      }
      if (countPost >= 5 && countPost <= 7) {
        //increase percent to sleep this time
        const rd = random(0, 10);
        if (rd >= 3) {
          sleepThisTime();
          return;
        }
      }
      //random this time to post or not with 10% chance
      const rand = random(0, 10);
      if (rand >= 10 && countPost >= 2) {
        sleepThisTime();
        return;
      }
      addLog({
        vi: "Quyết định bắt đầu đợt đăng bài",
        en: "Decided to start this batch",
      });
      await automationContinue();
      const isShuffle =
        (await BG_getValue(KEY_IS_SHUFFLE_SCHEDULER_TIME)) || false;
      if (isShuffle) {
        shuffleTimes();
      }
    }
  } catch (error) {
    logError("Error at alarm: ", error);
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
