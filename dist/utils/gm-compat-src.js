/**
 * GM Compatibility Layer for Chrome Extension
 * Provides Tampermonkey-compatible API wrappers using Chrome Extension APIs.
 *
 * Usage: gm-compat.js is loaded BEFORE content.js via manifest.json content_scripts.
 * All GM_* functions are available globally in content script context.
 */

import {
	KEY_CLEAR_NOTIFICATION,
	KEY_NOTIFICATION,
	KEY_OPEN_IN_TAB,
	KEY_REGISTER_MENU_COMMAND,
	KEY_UNREGISTER_MENU_COMMAND,
	KEY_XMLHTTP_REQUEST,
	KEY_XMLHTTP_REQUEST_RESPONSE,
} from "../contants/constant-extention";

// eslint-disable-next-line no-var
var GM = (function () {
	"use strict";

	// ============================================================
	// STORAGE: GM_getValue, GM_setValue, GM_deleteValue, GM_listValues
	// Backed by chrome.storage.local
	// ============================================================

	/**
	 * GM_getValue(key, defaultValue) -> Promise<any>
	 * Retrieves a value from extension storage.
	 *
	 * Example:
	 *   const count = await GM_getValue('postCount', 0);
	 */
	async function GM_getValue(key, defaultValue) {
		try {
			const result = await chrome.storage.local.get(key);
			return result[key] !== undefined ? result[key] : defaultValue;
		} catch (e) {
			console.log("[GM Compat] GM_getValue error:", e);
			return defaultValue;
		}
	}

	/**
	 * GM_setValue(key, value) -> Promise<void>
	 * Stores a value in extension storage. Supports any JSON-serializable type.
	 *
	 * Example:
	 *   await GM_setValue('postCount', 42);
	 *   await GM_setValue('lastPost', { content: 'Hello', time: Date.now() });
	 */
	async function GM_setValue(key, value) {
		try {
			await chrome.storage.local.set({ [key]: value });
		} catch (e) {
			console.log("[GM Compat] GM_setValue error:", e);
		}
	}

	/**
	 * GM_deleteValue(key) -> Promise<void>
	 * Removes a key from extension storage.
	 *
	 * Example:
	 *   await GM_deleteValue('postCount');
	 */
	async function GM_deleteValue(key) {
		try {
			await chrome.storage.local.remove(key);
		} catch (e) {
			console.log("[GM Compat] GM_deleteValue error:", e);
		}
	}

	/**
	 * GM_listValues() -> Promise<string[]>
	 * Returns all keys currently stored.
	 *
	 * Example:
	 *   const keys = await GM_listValues();
	 *   // ['postCount', 'lastPost', 'settings']
	 */
	async function GM_listValues() {
		try {
			const result = await chrome.storage.local.get(null);
			return Object.keys(result);
		} catch (e) {
			console.log("[GM Compat] GM_listValues error:", e);
			return [];
		}
	}

	// ============================================================
	// VALUE CHANGE LISTENER: GM_addValueChangeListener, GM_removeValueChangeListener
	// Backed by chrome.storage.onChanged
	// ============================================================

	const _valueListeners = new Map(); // id -> { key, callback, chromeListener }
	let _listenerId = 0;

	/**
	 * GM_addValueChangeListener(key, callback) -> listenerId
	 * Watches for changes to a specific storage key.
	 * Callback signature: (key, oldValue, newValue, isRemote)
	 *   - isRemote: true if changed from another tab/context
	 *
	 * Example:
	 *   const id = GM_addValueChangeListener('postCount', (key, oldVal, newVal, isRemote) => {
	 *     console.log(`${key} changed from ${oldVal} to ${newVal}, remote: ${isRemote}`);
	 *   });
	 */
	function GM_addValueChangeListener(key, callback) {
		const id = ++_listenerId;

		const chromeListener = (changes, areaName) => {
			if (areaName !== "local") return;
			if (!changes[key]) return;

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
	 * GM_removeValueChangeListener(listenerId) -> void
	 * Removes a previously registered value change listener.
	 *
	 * Example:
	 *   GM_removeValueChangeListener(id);
	 */
	function GM_removeValueChangeListener(listenerId) {
		const entry = _valueListeners.get(listenerId);
		if (entry) {
			chrome.storage.onChanged.removeListener(entry.chromeListener);
			_valueListeners.delete(listenerId);
		}
	}

	// ============================================================
	// NOTIFICATIONS: GM_notification
	// Backed by chrome.notifications via background service worker
	// ============================================================

	/**
	 * GM_notification(details) -> void
	 * Shows a desktop notification.
	 *
	 * details: { title, text, image?, timeout?, onclick?, ondone? }
	 *   OR a simple string (used as text, title defaults to extension name)
	 *
	 * Example:
	 *   GM_notification({
	 *     title: 'Post Success',
	 *     text: 'Your post has been published!',
	 *     timeout: 5000,
	 *     onclick: () => console.log('notification clicked')
	 *   });
	 *
	 *   GM_notification('Quick message here');
	 */
	function GM_notification(details) {
		if (typeof details === "string") {
			details = { title: "FB Auto Post", text: details };
		}

		const notifId = "gm_notif_" + Date.now();

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
	// TAB MANAGEMENT: GM_openInTab
	// Backed by chrome.tabs.create via background service worker
	// ============================================================

	/**
	 * GM_openInTab(url, options?) -> void
	 * Opens a URL in a new tab.
	 *
	 * options: { active: boolean, insert: boolean } OR boolean (true = background)
	 *
	 * Example:
	 *   GM_openInTab('https://facebook.com/groups/mygroup', { active: true });
	 *   GM_openInTab('https://example.com', true); // open in background
	 */
	function GM_openInTab(url, options) {
		let active = true;
		if (typeof options === "boolean") {
			active = !options; // Tampermonkey: true = open in background
		} else if (options && typeof options === "object") {
			active = options.active !== false;
		}

		chrome.runtime.sendMessage({
			type: KEY_OPEN_IN_TAB,
			url: url,
			active: active,
		});
	}

	// ============================================================
	// MENU COMMANDS: GM_registerMenuCommand, GM_unregisterMenuCommand
	// Backed by chrome.contextMenus via background service worker
	// ============================================================

	const _menuCommands = new Map(); // id -> callback

	/**
	 * GM_registerMenuCommand(name, callback) -> commandId
	 * Registers a command in the extension's context menu.
	 *
	 * Example:
	 *   const cmdId = GM_registerMenuCommand('Reset Settings', () => {
	 *     GM_deleteValue('settings');
	 *     console.log('Settings reset!');
	 *   });
	 */
	function GM_registerMenuCommand(name, callback) {
		const id =
			"gm_menu_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

		chrome.runtime.sendMessage({
			type: KEY_REGISTER_MENU_COMMAND,
			id: id,
			title: name,
		});

		_menuCommands.set(id, callback);
		return id;
	}

	/**
	 * GM_unregisterMenuCommand(commandId) -> void
	 *
	 * Example:
	 *   GM_unregisterMenuCommand(cmdId);
	 */
	function GM_unregisterMenuCommand(commandId) {
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
	// CLIPBOARD: GM_setClipboard
	// ============================================================

	/**
	 * GM_setClipboard(text, type?) -> Promise<void>
	 * Copies text to clipboard.
	 *
	 * Example:
	 *   await GM_setClipboard('Copied this text!');
	 */
	async function GM_setClipboard(text, _type) {
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
	// RESOURCE & INFO: GM_getResourceURL, GM_info, GM_log
	// ============================================================

	/**
	 * GM_getResourceURL(resourceName) -> string
	 * Returns the full URL of a bundled extension resource.
	 *
	 * Example:
	 *   const iconUrl = GM_getResourceURL('icons/icon-128.png');
	 *   // "chrome-extension://abc123/icons/icon-128.png"
	 */
	function GM_getResourceURL(resourceName) {
		return chrome.runtime.getURL(resourceName);
	}

	/**
	 * GM_info -> object
	 * Returns metadata about the extension (mirrors Tampermonkey's GM_info).
	 *
	 * Example:
	 *   console.log(GM_info.script.name);    // "FB Auto Post"
	 *   console.log(GM_info.script.version); // "1.1.0"
	 */
	const GM_info = (() => {
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
	 * GM_log(message) -> void
	 * Logs a message to the browser console with a prefix.
	 *
	 * Example:
	 *   GM_log('Script initialized');
	 */
	function GM_log(message) {
		console.log("%c[GM]", "color: #2ecc71; font-weight: bold;", message);
	}

	// ============================================================
	// STYLE INJECTION: GM_addStyle
	// ============================================================

	/**
	 * GM_addStyle(css) -> HTMLStyleElement
	 * Injects a CSS string into the page. Returns the <style> element.
	 *
	 * Example:
	 *   GM_addStyle('.my-class { color: red; font-size: 16px; }');
	 */
	function GM_addStyle(css) {
		const style = document.createElement("style");
		style.textContent = css;
		(document.head || document.documentElement).appendChild(style);
		return style;
	}

	// ============================================================
	// HTTP REQUESTS: GM_xmlhttpRequest
	// Backed by background service worker fetch (bypasses CORS)
	// ============================================================

	/**
	 * GM_xmlhttpRequest(details) -> void
	 * Makes an HTTP request that can bypass CORS restrictions.
	 * The request is proxied through the background service worker.
	 *
	 * details: { method, url, headers?, data?, onload?, onerror?, ontimeout? }
	 *
	 * Example:
	 *   GM_xmlhttpRequest({
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
	function GM_xmlhttpRequest(details) {
		const requestId =
			"gm_xhr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

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

	// ============================================================
	// EXPORT: Attach all GM_* functions to window for global access
	// ============================================================

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
		GM_xmlhttpRequest,
	};

	// Attach to window so content.js and other scripts can use them globally
	for (const [name, fn] of Object.entries(api)) {
		window[name] = fn;
	}

	console.log(
		"%c[GM Compat] Tampermonkey API layer loaded",
		"color: #2ecc71; font-weight: bold;",
	);

	return api;
})();
