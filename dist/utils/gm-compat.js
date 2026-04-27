(() => {
  // dist/contants/constant-extention.js
  var KEY_NOTIFICATION = "GM_notification";
  var KEY_OPEN_IN_TAB = "GM_openInTab";
  var KEY_REGISTER_MENU_COMMAND = "GM_registerMenuCommand";
  var KEY_UNREGISTER_MENU_COMMAND = "GM_unregisterMenuCommand";
  var KEY_XMLHTTP_REQUEST = "GM_xmlhttpRequest";
  var KEY_XMLHTTP_REQUEST_RESPONSE = "GM_xmlhttpRequest_response";
  var KEY_CLEAR_NOTIFICATION = "clearNotification";

  // dist/utils/gm-compat-src.js
  var GM = (function() {
    "use strict";
    async function GM_getValue(key, defaultValue) {
      try {
        const result = await chrome.storage.local.get(key);
        return result[key] !== void 0 ? result[key] : defaultValue;
      } catch (e) {
        console.log("[GM Compat] GM_getValue error:", e);
        return defaultValue;
      }
    }
    async function GM_setValue(key, value) {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (e) {
        console.log("[GM Compat] GM_setValue error:", e);
      }
    }
    async function GM_deleteValue(key) {
      try {
        await chrome.storage.local.remove(key);
      } catch (e) {
        console.log("[GM Compat] GM_deleteValue error:", e);
      }
    }
    async function GM_listValues() {
      try {
        const result = await chrome.storage.local.get(null);
        return Object.keys(result);
      } catch (e) {
        console.log("[GM Compat] GM_listValues error:", e);
        return [];
      }
    }
    const _valueListeners = /* @__PURE__ */ new Map();
    let _listenerId = 0;
    function GM_addValueChangeListener(key, callback) {
      const id = ++_listenerId;
      const chromeListener = (changes, areaName) => {
        if (areaName !== "local") return;
        if (!changes[key]) return;
        const oldValue = changes[key].oldValue;
        const newValue = changes[key].newValue;
        callback(key, oldValue, newValue, true);
      };
      chrome.storage.onChanged.addListener(chromeListener);
      _valueListeners.set(id, { key, callback, chromeListener });
      return id;
    }
    function GM_removeValueChangeListener(listenerId) {
      const entry = _valueListeners.get(listenerId);
      if (entry) {
        chrome.storage.onChanged.removeListener(entry.chromeListener);
        _valueListeners.delete(listenerId);
      }
    }
    function GM_notification(details) {
      if (typeof details === "string") {
        details = { title: "FB Auto Post", text: details };
      }
      const notifId = "gm_notif_" + Date.now();
      chrome.runtime.sendMessage({
        type: KEY_NOTIFICATION,
        id: notifId,
        title: details.title || "FB Auto Post",
        message: details.text || "",
        iconUrl: details.image || chrome.runtime.getURL("icons/icon-128.png")
      });
      if (details.onclick || details.ondone) {
        const handler = (msg) => {
          if (msg.type === "notificationClicked" && msg.id === notifId && details.onclick) {
            details.onclick();
          }
          if (msg.type === "notificationClosed" && msg.id === notifId) {
            if (details.ondone) details.ondone();
            chrome.runtime.onMessage.removeListener(handler);
          }
        };
        chrome.runtime.onMessage.addListener(handler);
      }
      if (details.timeout) {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: KEY_CLEAR_NOTIFICATION,
            id: notifId
          });
        }, details.timeout);
      }
    }
    function GM_openInTab(url, options) {
      let active = true;
      if (typeof options === "boolean") {
        active = !options;
      } else if (options && typeof options === "object") {
        active = options.active !== false;
      }
      chrome.runtime.sendMessage({
        type: KEY_OPEN_IN_TAB,
        url,
        active
      });
    }
    const _menuCommands = /* @__PURE__ */ new Map();
    function GM_registerMenuCommand(name, callback) {
      const id = "gm_menu_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      chrome.runtime.sendMessage({
        type: KEY_REGISTER_MENU_COMMAND,
        id,
        title: name
      });
      _menuCommands.set(id, callback);
      return id;
    }
    function GM_unregisterMenuCommand(commandId) {
      chrome.runtime.sendMessage({
        type: KEY_UNREGISTER_MENU_COMMAND,
        id: commandId
      });
      _menuCommands.delete(commandId);
    }
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "menuCommandClicked" && _menuCommands.has(msg.id)) {
        _menuCommands.get(msg.id)();
      }
    });
    async function GM_setClipboard(text, _type) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
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
    function GM_getResourceURL(resourceName) {
      return chrome.runtime.getURL(resourceName);
    }
    const GM_info = (() => {
      try {
        const manifest = chrome.runtime.getManifest();
        return {
          script: {
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            author: manifest.author || ""
          },
          scriptHandler: "Chrome Extension",
          version: manifest.version
        };
      } catch (e) {
        return {
          script: { name: "FB Auto Post", version: "1.1.0" },
          scriptHandler: "Chrome Extension"
        };
      }
    })();
    function GM_log(message) {
      console.log("%c[GM]", "color: #2ecc71; font-weight: bold;", message);
    }
    function GM_addStyle(css) {
      const style = document.createElement("style");
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
      return style;
    }
    function GM_xmlhttpRequest(details) {
      const requestId = "gm_xhr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      const handler = (msg) => {
        if (msg.type !== KEY_XMLHTTP_REQUEST_RESPONSE || msg.requestId !== requestId)
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
            finalUrl: msg.finalUrl
          };
          if (details.onload) details.onload(response);
        }
      };
      chrome.runtime.onMessage.addListener(handler);
      chrome.runtime.sendMessage({
        type: KEY_XMLHTTP_REQUEST,
        requestId,
        method: details.method || "GET",
        url: details.url,
        headers: details.headers || {},
        data: details.data || null
      });
    }
    const api = {
      GM_getValue,
      GM_setValue,
      GM_deleteValue,
      GM_listValues,
      GM_addValueChangeListener,
      GM_removeValueChangeListener,
      GM_notification,
      GM_openInTab,
      GM_registerMenuCommand,
      GM_unregisterMenuCommand,
      GM_setClipboard,
      GM_getResourceURL,
      GM_info,
      GM_log,
      GM_addStyle,
      GM_xmlhttpRequest
    };
    for (const [name, fn] of Object.entries(api)) {
      window[name] = fn;
    }
    console.log(
      "%c[GM Compat] Tampermonkey API layer loaded",
      "color: #2ecc71; font-weight: bold;"
    );
    return api;
  })();
})();
