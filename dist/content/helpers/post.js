import {
	KEY_IS_TEST,
	KEY_LAST_TIME_POST,
	KEY_POST,
	KEY_POST_LENGTH,
	SELECTOR_RAW,
	STATUS_TASK,
} from "../../contants/contants.js";
import {
	KEY_GET_CURRENT_DATA_GROUP_SAVED_NEED_POST,
	KEY_UPDATE_STATUS_TASK,
} from "../../contants/constant-extention.js";
import { initialTimeDelay } from "../../contants/contants.js";
import { showNotify } from "../elements/notify.js";
import { sendMessage, sendMessageWithResponse } from "../utils/request.js";
import { CL_getIsTest, CL_getTimeDelayInStorage } from "../utils/storage.js";
import {
	logActions,
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

// import {
// 	findButtonPostAndClick,
// 	findDivInputTextbox,
// 	findDivToPost,
// 	getIsExistDialog,
// } from "./elementDom.js";
// import {
// 	checkPostedAllGroupOrMaxGroupPerTime,
// 	getCurrentDataGroupSavedNeedPost,
// 	getCurrentGroupNeedPost,
// 	resetPostedGroupAndSave,
// } from "./group.js";
// import {
// 	getCurrentIndexGroupPost,
// 	getIsStealFocusInStorage,
// 	getRandomIndexGroupChecked,
// 	getTimeDelayInStorage,
// 	setCurrentIndexGroupPost,
// 	setProgress,
// } from "./storage.js";

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
					await findButtonPostAndClick();
				} else {
					logError("Dialog not found, can not post this group");
				}
			}

			//complete task
			task.status = STATUS_TASK.DONE;
			sendMessage(KEY_UPDATE_STATUS_TASK, { status: task.status });
		} else {
			logError("Cant not post in this group");
			task.status = STATUS_TASK.ERROR;
			sendMessage(KEY_UPDATE_STATUS_TASK, { status: task.status });
		}
	} catch (error) {
		task.status = STATUS_TASK.ERROR;
		sendMessage(KEY_UPDATE_STATUS_TASK, { status: task.status });
		logError("Error at postHelper: " + error);
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

		DB_setValue(KEY_POST, { task, time: now() });

		if (isDelay) {
			await sleep(delayOpenNewTab);
		}

		const isFixStealFocus = await getIsStealFocusInStorage();

		if (isFixStealFocus) {
			DB_openInTab(task.id_href, { active: false, insert: true });
		} else {
			DB_openInTab(task.id_href, { active: true, insert: true });
		}
	} catch (error) {
		logError("Error at openNewTask: " + error);
		throw new Error("Error at openNewTask: " + error);
	}
}

export { pasteContent, fillFile, postHelper, openNewTask };
