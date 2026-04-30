import { KEY_SCHEDULER_ALARMS } from "../../../contants/constant-extention.js";
import { KEY_SCHEDULER } from "../../../contants/contants.js";
import { now, logActions, logError, sleep } from "../../../utils/utils.js";
import {
  createSchedulerDailyHours,
  getNextTimePost,
} from "../helpers/scheduler.js";
import { getProgress } from "../helpers/storage.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";

async function createSchedulerAuto() {
  try {
    const scheduler = await getSchedulerService();
    const isScheduler = scheduler?.isScheduler || false;
    if (isScheduler) {
      const nextTime = await getNextTimePost();
      chrome.alarms.create(KEY_SCHEDULER_ALARMS, {
        when: nextTime,
      });
      logActions(
        "created scheduler auto, next time: " +
          new Date(nextTime).toLocaleString(),
      );
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

/**
 * Get alarm scheduler
 * @returns {Promise<Object | null>}
 */
async function getAlarmScheduler() {
  try {
    const alarms = await chrome.alarms.get(KEY_SCHEDULER_ALARMS);
    return alarms || null;
  } catch (error) {
    logError("Error getAlarms:", error);
    return null;
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

async function clearAndCreateSchedulerAlarm() {
  try {
    const isProgress = await getProgress();
    if (isProgress) {
      clearSchedulerAuto();
      return;
    }
    clearSchedulerAuto();
    await sleep(2000);
    createSchedulerAuto();
  } catch (error) {
    logError("Error clearAndCreateSchedulerAlarm:", error);
  }
}

export {
  createSchedulerAuto,
  clearSchedulerAuto,
  setSchedulerService,
  getSchedulerService,
  getAlarmScheduler,
  clearAndCreateSchedulerAlarm,
};
