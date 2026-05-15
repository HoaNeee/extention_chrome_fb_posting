/**
 * DB Compatibility Layer for Chrome Extension
 * Provides Tampermonkey-compatible API wrappers using Chrome Extension APIs.
 *
 * Usage: DB-compat.js is loaded BEFORE content.js via manifest.json content_scripts.
 * All DB_* functions are available globally in content script context.
 */

import {
  KEY_CLEAR_NOTIFICATION,
  KEY_CURRENT_WINDOW_ID,
  KEY_NOTIFICATION,
  KEY_REGISTER_MENU_COMMAND,
  KEY_UNREGISTER_MENU_COMMAND,
  KEY_XMLHTTP_REQUEST,
  KEY_XMLHTTP_REQUEST_RESPONSE,
  URL_MATCH,
} from "../../../contants/constant-extention.js";
import { logError } from "../../../utils/utils.js";

// ============================================================
// STORAGE: DB_getValue, DB_setValue, DB_deleteValue, DB_listValues
// Backed by chrome.storage.local
// ============================================================

/**
 * DB_getValue(key, defaultValue) -> Promise<any>
 * Retrieves a value from extension storage.
 *  @param {string} key
 *  @param {any} defaultValue
 *  @returns {Promise<any>}
 * Example:
 *   const count = await DB_getValue('postCount', 0);
 */
async function DB_getValue(key, defaultValue) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch (e) {
    console.log("[DB Compat] DB_getValue error:", e);
    return defaultValue;
  }
}

/**
 * DB_setValue(key, value) -> Promise<void>
 * Stores a value in extension storage. Supports any JSON-serializable type.
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 * @example await DB_setValue('postCount', 42);
 * @example await DB_setValue('lastPost', { content: 'Hello', time: Date.now() });
 */
async function DB_setValue(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (e) {
    console.log("[DB Compat] DB_setValue error:", e);
  }
}

/**
 * DB_deleteValue(key) -> Promise<void>
 * Removes a key from extension storage.
 * @param {string} key
 * @returns {Promise<void>}
 * @example await DB_deleteValue('postCount');
 */
async function DB_deleteValue(key) {
  try {
    await chrome.storage.local.remove(key);
  } catch (e) {
    console.log("[DB Compat] DB_deleteValue error:", e);
  }
}

/**
 * DB_listValues() -> Promise<string[]>
 * Returns all keys currently stored.
 *
 * Example:
 *   const keys = await DB_listValues();
 *   // ['postCount', 'lastPost', 'settings']
 */
async function DB_listValues() {
  try {
    const result = await chrome.storage.local.get(null);
    return Object.keys(result);
  } catch (e) {
    console.log("[DB Compat] DB_listValues error:", e);
    return [];
  }
}

// ============================================================
// VALUE CHANGE LISTENER: DB_addValueChangeListener, DB_removeValueChangeListener
// Backed by chrome.storage.onChanged
// ============================================================

const _valueListeners = new Map(); // id -> { key, callback, chromeListener }
let _listenerId = 0;

/**
 * DB_addValueChangeListener(key, callback) -> listenerId
 * Watches for changes to a specific storage key.
 * Callback signature: (key, oldValue, newValue, isRemote)
 *   - isRemote: true if changed from another tab/context
 *
 * Example:
 *   const id = DB_addValueChangeListener('postCount', (key, oldVal, newVal, isRemote) => {
 *     console.log(`${key} changed from ${oldVal} to ${newVal}, remote: ${isRemote}`);
 *   });
 */
function DB_addValueChangeListener(key, callback) {
  const id = ++_listenerId;

  const chromeListener = (changes, areaName) => {
    if (areaName !== "local") return;
    if (!changes[key]) return;

    console.log(changes);

    const oldValue = changes[key].oldValue;
    const newValue = changes[key].newValue;
    // isRemote = true (always true in extension context, since changes can come from any script)
    callback(key, oldValue, newValue, true);
  };

  chrome.storage.onChanged.addListener(chromeListener);
  _valueListeners.set(id, { key, callback, chromeListener });

  return id;
}

/**
 * DB_removeValueChangeListener(listenerId) -> void
 * Removes a previously registered value change listener.
 *
 * Example:
 *   DB_removeValueChangeListener(id);
 */
function DB_removeValueChangeListener(listenerId) {
  const entry = _valueListeners.get(listenerId);
  if (entry) {
    chrome.storage.onChanged.removeListener(entry.chromeListener);
    _valueListeners.delete(listenerId);
  }
}

// ============================================================
// NOTIFICATIONS: DB_notification
// Backed by chrome.notifications via background service worker
// ============================================================

/**
 * DB_notification(details) -> void
 * Shows a desktop notification.
 *
 * details: { title, text, image?, timeout?, onclick?, ondone? }
 *   OR a simple string (used as text, title defaults to extension name)
 *
 * Example:
 *   DB_notification({
 *     title: 'Post Success',
 *     text: 'Your post has been published!',
 *     timeout: 5000,
 *     onclick: () => console.log('notification clicked')
 *   });
 *
 *   DB_notification('Quick message here');
 */
function DB_notification(details) {
  if (typeof details === "string") {
    details = { title: "FB Auto Post", text: details };
  }

  const notifId = "DB_notif_" + Date.now();

  // Send to background service worker to create notification
  chrome.runtime.sendMessage({
    type: KEY_NOTIFICATION,
    id: notifId,
    title: details.title || "FB Auto Post",
    message: details.text || "",
    iconUrl: details.image || chrome.runtime.getURL("icons/icon-128.png"),
  });

  // Handle onclick/ondone via message listener
  if (details.onclick || details.ondone) {
    const handler = (msg) => {
      if (
        msg.type === "notificationClicked" &&
        msg.id === notifId &&
        details.onclick
      ) {
        details.onclick();
      }
      if (msg.type === "notificationClosed" && msg.id === notifId) {
        if (details.ondone) details.ondone();
        chrome.runtime.onMessage.removeListener(handler);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
  }

  // Auto-close after timeout
  if (details.timeout) {
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: KEY_CLEAR_NOTIFICATION,
        id: notifId,
      });
    }, details.timeout);
  }
}

// ============================================================
// TAB MANAGEMENT: DB_openInTab
// Backed by chrome.tabs.create via background service worker
// ============================================================

/**
 * DB_openInTab(url, options?) -> void
 * Opens a URL in a new tab.
 *
 * @param {string} url
 * @param {{ active: boolean, insert: boolean }} options
 *
 * @example DB_openInTab('https://facebook.com/groups/mygroup', { active: true });
 */
async function DB_openInTab(url, options) {
  const tab = await chrome.tabs.create({
    url: url,
    active: options?.active,
    windowId: options?.windowId || (await DB_getValue(KEY_CURRENT_WINDOW_ID)),
  });

  //force close tab that is open this tool after 7 minutes
  setTimeout(
    () => {
      try {
        //check tab if exist
        chrome.tabs.query({ url: URL_MATCH }, function (tabs) {
          try {
            if (tabs && tabs.length > 0) {
              const find = tabs.find((t) => t.id === tab.id);
              if (find) {
                chrome.tabs.remove(tab.id);
              }
            }
          } catch (error) {
            logError("Error at DB_openInTab force close tab: " + error);
          }
        });
      } catch (error) {
        logError("Error at DB_openInTab force close tab: " + error);
      }
    },
    1000 * 60 * 7,
  );

  return tab.id;
}

// ============================================================
// MENU COMMANDS: DB_registerMenuCommand, DB_unregisterMenuCommand
// Backed by chrome.contextMenus via background service worker
// ============================================================

const _menuCommands = new Map(); // id -> callback

/**
 * DB_registerMenuCommand(name, callback) -> commandId
 * Registers a command in the extension's context menu.
 *
 * Example:
 *   const cmdId = DB_registerMenuCommand('Reset Settings', () => {
 *     DB_deleteValue('settings');
 *     console.log('Settings reset!');
 *   });
 */
function DB_registerMenuCommand(name, callback) {
  const id =
    "DB_menu_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

  chrome.runtime.sendMessage({
    type: KEY_REGISTER_MENU_COMMAND,
    id: id,
    title: name,
  });

  _menuCommands.set(id, callback);
  return id;
}

/**
 * DB_unregisterMenuCommand(commandId) -> void
 *
 * Example:
 *   DB_unregisterMenuCommand(cmdId);
 */
function DB_unregisterMenuCommand(commandId) {
  chrome.runtime.sendMessage({
    type: KEY_UNREGISTER_MENU_COMMAND,
    id: commandId,
  });
  _menuCommands.delete(commandId);
}

// Listen for menu command clicks from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "menuCommandClicked" && _menuCommands.has(msg.id)) {
    _menuCommands.get(msg.id)();
  }
});

// ============================================================
// CLIPBOARD: DB_setClipboard
// ============================================================

/**
 * DB_setClipboard(text, type?) -> Promise<void>
 * Copies text to clipboard.
 *
 * Example:
 *   await DB_setClipboard('Copied this text!');
 */
async function DB_setClipboard(text, _type) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // Fallback: execCommand
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

// ============================================================
// RESOURCE & INFO: DB_getResourceURL, DB_info, DB_log
// ============================================================

/**
 * DB_getResourceURL(resourceName) -> string
 * Returns the full URL of a bundled extension resource.
 *
 * Example:
 *   const iconUrl = DB_getResourceURL('icons/icon-128.png');
 *   // "chrome-extension://abc123/icons/icon-128.png"
 */
function DB_getResourceURL(resourceName) {
  return chrome.runtime.getURL(resourceName);
}

/**
 * DB_info -> object
 * Returns metadata about the extension (mirrors Tampermonkey's DB_info).
 *
 * Example:
 *   console.log(DB_info.script.name);    // "FB Auto Post"
 *   console.log(DB_info.script.version); // "1.1.0"
 */
const DB_info = (() => {
  try {
    const manifest = chrome.runtime.getManifest();
    return {
      script: {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author || "",
      },
      scriptHandler: "Chrome Extension",
      version: manifest.version,
    };
  } catch (e) {
    return {
      script: { name: "FB Auto Post", version: "1.1.0" },
      scriptHandler: "Chrome Extension",
    };
  }
})();

/**
 * DB_log(message) -> void
 * Logs a message to the browser console with a prefix.
 *
 * Example:
 *   DB_log('Script initialized');
 */
function DB_log(message) {
  console.log("%c[DB]", "color: #2ecc71; font-weight: bold;", message);
}

// ============================================================
// STYLE INJECTION: DB_addStyle
// ============================================================

/**
 * DB_addStyle(css) -> HTMLStyleElement
 * Injects a CSS string into the page. Returns the <style> element.
 *
 * Example:
 *   DB_addStyle('.my-class { color: red; font-size: 16px; }');
 */
function DB_addStyle(css) {
  const style = document.createElement("style");
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
  return style;
}

// ============================================================
// HTTP REQUESTS: DB_xmlhttpRequest
// Backed by background service worker fetch (bypasses CORS)
// ============================================================

/**
 * DB_xmlhttpRequest(details) -> void
 * Makes an HTTP request that can bypass CORS restrictions.
 * The request is proxied through the background service worker.
 *
 * details: { method, url, headers?, data?, onload?, onerror?, ontimeout? }
 *
 * Example:
 *   DB_xmlhttpRequest({
 *     method: 'GET',
 *     url: 'https://api.example.com/data',
 *     headers: { 'Accept': 'application/json' },
 *     onload: (response) => {
 *       console.log('Status:', response.status);
 *       console.log('Body:', response.responseText);
 *     },
 *     onerror: (error) => {
 *       console.error('Request failed:', error);
 *     }
 *   });
 */
function DB_xmlhttpRequest(details) {
  const requestId =
    "DB_xhr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

  const handler = (msg) => {
    if (
      msg.type !== KEY_XMLHTTP_REQUEST_RESPONSE ||
      msg.requestId !== requestId
    )
      return;
    chrome.runtime.onMessage.removeListener(handler);

    if (msg.error) {
      if (details.onerror) details.onerror({ error: msg.error });
    } else {
      const response = {
        status: msg.status,
        statusText: msg.statusText,
        responseText: msg.responseText,
        responseHeaders: msg.responseHeaders,
        finalUrl: msg.finalUrl,
      };
      if (details.onload) details.onload(response);
    }
  };

  chrome.runtime.onMessage.addListener(handler);

  chrome.runtime.sendMessage({
    type: KEY_XMLHTTP_REQUEST,
    requestId: requestId,
    method: details.method || "GET",
    url: details.url,
    headers: details.headers || {},
    data: details.data || null,
  });
}

/**
 * DB_sendMessage(msg, options) -> void
 * Sends a message to the background service worker.
 * @param {string} msg
 * @param {any} options
 */
function DB_sendMessage(msg, options) {
  chrome.runtime.sendMessage({ type: msg, options });
}

// ============================================================
// EXPORT: Attach all DB_* functions to window for global access
// ============================================================

export {
  DB_deleteValue,
  DB_listValues,
  DB_addValueChangeListener,
  DB_removeValueChangeListener,
  DB_notification,
  DB_openInTab,
  DB_registerMenuCommand,
  DB_unregisterMenuCommand,
  DB_setClipboard,
  DB_getResourceURL,
  DB_info,
  DB_log,
  DB_addStyle,
  DB_xmlhttpRequest,
  DB_getValue,
  DB_setValue,
  DB_sendMessage,
};
