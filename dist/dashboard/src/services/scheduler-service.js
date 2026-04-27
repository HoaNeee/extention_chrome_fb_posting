import { KEY_SCHEDULER_ALARMS } from "../../../contants/constant-extention.js";
import { KEY_SCHEDULER } from "../../../contants/contants.js";
import { now, logActions, logError } from "../../../utils/utils.js";
import { createSchedulerDailyHours } from "../helpers/scheduler.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";

async function createSchedulerAuto() {
	try {
		const scheduler = await getSchedulerService();
		const isScheduler = scheduler?.isScheduler || false;
		if (isScheduler) {
			chrome.alarms.create(KEY_SCHEDULER_ALARMS, {
				delayInMinutes: 0.5, //30 seconds for delay first time
				periodInMinutes: 0.5, //30 seconds repeat
			});
			logActions("created scheduler auto");
		}
	} catch (error) {
		logError("Error createSchedulerAuto:", error);
	}
}

async function clearSchedulerAuto() {
	try {
		logActions("clear scheduler auto");
		chrome.alarms.clear(KEY_SCHEDULER_ALARMS);
	} catch (error) {
		logError("Error clearSchedulerAuto:", error);
	}
}

const initScheduler = {
	type: "daily-hours", //custom-every-hours, custom-every-minutes, frame-hours
	frameHours: [],
	schedulerMinutes: [],
	schedulerHours: [],
	dailyHours: createSchedulerDailyHours(),
	isScheduler: false,
	valueMinutes: 5,
	valueHours: 1,
	time: now(),
};

/**
 *
 * @param {typeof initScheduler} scheduler
 */
async function setSchedulerService(scheduler = initScheduler) {
	const {
		dailyHours,
		frameHours,
		schedulerMinutes,
		schedulerHours,
		type,
		isScheduler,
		valueMinutes,
		valueHours,
		time,
	} = scheduler;

	await DB_setValue(KEY_SCHEDULER, {
		frameHours,
		schedulerMinutes,
		schedulerHours,
		dailyHours,
		type,
		isScheduler,
		valueMinutes,
		valueHours,
		time,
	});
}

/**
 *
 * @returns {Promise<typeof initScheduler>}
 */
async function getSchedulerService() {
	const scheduler = await DB_getValue(KEY_SCHEDULER);
	if (!scheduler) {
		setSchedulerService(initScheduler);
		return initScheduler;
	}
	return scheduler;
}

export {
	createSchedulerAuto,
	clearSchedulerAuto,
	setSchedulerService,
	getSchedulerService,
};
