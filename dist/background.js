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
	KEY_UPDATE_STATUS_TASK,
	KEY_XMLHTTP_REQUEST,
	STATUS_RESPONSE,
	URL_MATCH,
} from "./contants/constant-extention.js";
import {
	KEY_CAN_POST_THIS_TAB,
	KEY_IS_SCROLL_DETECT_LIST_GROUP,
	KEY_POST,
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
import {
	getCurrentIndexGroupPost,
	getRandomIndexGroupChecked,
	setCurrentIndexGroupPost,
} from "./dashboard/src/helpers/storage.js";
import {
	getAllGroupPostedsInStorage,
	getListGroupsNeedPostInStorage,
} from "./dashboard/src/services/groupService.js";
import { DB_openInTab } from "./dashboard/src/utils/api-helper.js";
import {
	BG_deleteValue,
	BG_getValue,
	BG_setValue,
	getTask,
	saveTask,
	setCurrentPostLength,
	setProgressTool,
	setStatusTask,
} from "./utils/bgr-storage.js";
import { logActions, logError, now } from "./utils/utils.js";

//KEY TEST, DELETE AFTER FINISH
const KEY_COUNT_TRIGGER_TEST = "count triggered";

//ALARMS
chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === KEY_SCHEDULER_ALARMS) {
		chrome.tabs.query({}, (tabs) => {
			console.log(tabs);
		});
	}
});

//event tab remove
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
	const tabIdGetListGroup = await BG_getValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
	if (tabId === tabIdGetListGroup) {
		console.log("[FB Auto Post] Tab get list groups removed");
		BG_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, false);
		BG_deleteValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
	}

	//check when posting was be close
	const tabIdPost = await BG_getValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
	if (tabId === tabIdPost) {
		setProgressTool(false);
		BG_deleteValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
	}
});

//event reload not create tab
chrome.webNavigation.onCommitted.addListener(async (details) => {
	//check get list groups tab was be reload -> set
	const tabIdGetListGroup = await BG_getValue(KEY_TAB.TAB_GET_LIST_GROUP_ID);
	const tabIdPost = await BG_getValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
	if (details.frameId === 0) {
		const currentId = details.tabId;
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
	}
});

// ============================================================
// MESSAGE ROUTER: Listens for messages from content scripts
// ============================================================

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
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
				const t = await chrome.tabs.create({
					url: msg.url,
					active: msg.active !== false,
				});
				await BG_setValue(KEY_LAST_TAB_OPEN_ID, t.id);
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
				chrome.tabs.remove(sender.tab.id);
				break;

			case KEY_GET_LIST_GROUPS:
				await BG_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, true);
				const tab = await chrome.tabs.create({
					url: URL_LIST_GROUPS,
					active: true,
				});
				await BG_setValue(KEY_TAB.TAB_GET_LIST_GROUP_ID, tab.id);
				break;

			case KEY_CAN_POST_THIS_TAB:
				const lastTabPostId = await BG_getValue(KEY_TAB.LAST_POST_TAB_OPEN_ID);
				const taskObject = await getTask();
				const task = taskObject?.task;

				await chrome.tabs.query({ url: URL_MATCH }).then((tabs) => {
					for (const tab of tabs) {
						const id = tab.id;
						if (id === lastTabPostId) {
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
					}
				});
				sendResponse({
					status: STATUS_RESPONSE.FAIL,
					message:
						"Can not post this tab, because this tab maybe open by user, not by tool",
				});
				return true;

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

			case KEY_UPDATE_STATUS_TASK:
				await setStatusTask(msg.data.status);
				break;

			case KEY_GET_CURRENT_DATA_GROUP_SAVED_NEED_POST:
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
				return true;

			case KEY_NEXT_POST_GROUP:
				nextGroupPost();
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

		if (nextTaskFind) {
			logActions("open next task: ", nextTaskFind);
			saveTask({ task: nextTaskFind, time: now() });
			DB_openInTab(nextTaskFind.id_href);
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
