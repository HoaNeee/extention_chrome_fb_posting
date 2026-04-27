import {
	initialTimeDelay,
	KEY_IS_IN_PROGRESS,
	KEY_IS_TEST,
	KEY_TIME_DELAY,
} from "../../contants/contants";

async function CL_getIsTest() {
	const isTest = await GM_getValue(KEY_IS_TEST);
	return isTest || false;
}

/**
 *
 * @returns {Promise<typeof initialTimeDelay>} The time delay settings from storage, or the initial default if not set
 */
async function CL_getTimeDelayInStorage() {
	const timeDelay = await GM_getValue(KEY_TIME_DELAY);
	if (!timeDelay) {
		CL_setTimeDelayInStorage();
		return initialTimeDelay;
	}
	return timeDelay;
}

/**
 *
 * @param {typeof initialTimeDelay} timeDelay
 */
function CL_setTimeDelayInStorage(timeDelay = initialTimeDelay) {
	GM_setValue(KEY_TIME_DELAY, timeDelay);
}

/**
 *
 * @returns {Promise<boolean>}
 */
async function CL_getProgressTool() {
	const isProgress = await GM_getValue(KEY_IS_IN_PROGRESS);
	return isProgress || false;
}

export {
	CL_getIsTest,
	CL_getTimeDelayInStorage,
	CL_setTimeDelayInStorage,
	CL_getProgressTool,
};
