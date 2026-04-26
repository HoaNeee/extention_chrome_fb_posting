/**
 * Background Service Worker for FB Auto Post Extension
 * Handles operations that content scripts cannot perform directly:
 *   - chrome.notifications (GM_notification)
 *   - chrome.tabs (GM_openInTab)
 *   - chrome.contextMenus (GM_registerMenuCommand)
 *   - fetch proxy (GM_xmlhttpRequest - CORS bypass)
 */

import {
  KEY_CLEAR_NOTIFICATION,
  KEY_CLOSE_THIS_TAB,
  KEY_GM_NOTIFICATION,
  KEY_GM_OPEN_IN_TAB,
  KEY_GM_REGISTER_MENU_COMMAND,
  KEY_GM_UNREGISTER_MENU_COMMAND,
  KEY_GM_XMLHTTP_REQUEST,
} from "../../contants/constant-extention";
import { KEY_SCHEDULER, URL_DASHBOARD } from "../../contants/contants";

// ============================================================
// MESSAGE ROUTER: Listens for messages from content scripts
// ============================================================

const urlDashboard = URL_DASHBOARD;

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  switch (msg.type) {
    // --- GM_notification ---
    case KEY_GM_NOTIFICATION:
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
    case KEY_GM_OPEN_IN_TAB:
      chrome.tabs.create({
        url: msg.url,
        active: msg.active !== false,
      });
      break;

    // --- GM_registerMenuCommand ---
    case KEY_GM_REGISTER_MENU_COMMAND:
      chrome.contextMenus.create({
        id: msg.id,
        title: msg.title,
        contexts: ["page"],
        documentUrlPatterns: ["https://www.facebook.com/*"],
      });
      break;

    case KEY_GM_UNREGISTER_MENU_COMMAND:
      chrome.contextMenus.remove(msg.id).catch(() => {});
      break;

    // --- GM_xmlhttpRequest (CORS bypass via background fetch) ---
    case KEY_GM_XMLHTTP_REQUEST:
      handleXHR(msg, sender);
      break;

    //CLOSE THIS TAB
    case KEY_CLOSE_THIS_TAB:
      chrome.tabs.remove(sender.tab.id);
      break;

    case "OPEN_DASHBOARD":
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
      break;

    // case "START_SCHEDULER":
    //   chrome.alarms.create("checkScheduler", {
    //     periodInMinutes: 0.5,
    //   });

    //   //   chrome.alarms.onAlarm.addListener(async (alarm) => {
    //   //     if (alarm.name === "checkScheduler") {
    //   //     }
    //   //   });

    //   const scheduler = await chrome.storage.local.get(KEY_SCHEDULER);
    //   console.log(scheduler);

    //   break;
    // case "STOP_SCHEDULER":
    //   console.log("[FB Auto Post] STOP_SCHEDULER");
    //   break;
  }
});

// chrome.runtime.onInstalled.addListener(() => {
//   chrome.tabs.query({ url: "https://www.facebook.com/*" }, async (tabs) => {
//     let countTabDashboard = 0;
//     for (const tab of tabs) {
//       console.log(tab);
//       if (tab.url === URL_DASHBOARD) {
//         countTabDashboard++;
//       }
//     }
//     if (countTabDashboard > 1) {
//       console.log("[FB Auto Post] More than 1 tab dashboard found, close them");
//     }
//   });
// });

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

// ============================================================
// CONTEXT MENU CLICK HANDLER
// ============================================================

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab && tab.id && info.menuItemId) {
    chrome.tabs.sendMessage(tab.id, {
      type: "menuCommandClicked",
      id: info.menuItemId,
    });
  }
});

// ============================================================
// NOTIFICATION CLICK/CLOSE HANDLERS
// ============================================================

chrome.notifications.onClicked.addListener((notifId) => {
  // Broadcast to all Facebook tabs
  chrome.tabs.query({ url: "https://www.facebook.com/*" }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: "notificationClicked",
        id: notifId,
      });
    }
  });
});

chrome.notifications.onClosed.addListener((notifId) => {
  chrome.tabs.query({ url: "https://www.facebook.com/*" }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: "notificationClosed",
        id: notifId,
      });
    }
  });
});

console.log("[FB Auto Post] Background service worker started");
