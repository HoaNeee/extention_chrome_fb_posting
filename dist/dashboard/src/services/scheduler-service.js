import { KEY_SCHEDULER_ALARMS } from "../../../contants/constant-extention.js";
import { KEY_IS_SPAMMED, KEY_SCHEDULER } from "../../../contants/contants.js";
import { now, logActions, logError, random } from "../../../utils/utils.js";
import { addLog } from "../draw_element/panel-log.js";
import {
  createSchedulerDailyHours,
  getNextTimePost,
  getNextTimePostWhenSpammed,
} from "../helpers/scheduler.js";
import { getProgress } from "../helpers/storage.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";

async function createSchedulerAuto(forceTime = 0) {
  try {
    const scheduler = await getSchedulerService();
    const isScheduler = scheduler?.isScheduler || false;
    const randomMinutes = random(-2, 2) * 1000 * 60;
    if (isScheduler) {
      let nextTime = 0;
      if (forceTime) {
        nextTime = forceTime;
      } else {
        const isSpammed = await DB_getValue(KEY_IS_SPAMMED);
        if (isSpammed) {
          nextTime = await getNextTimePostWhenSpammed();
        } else {
          nextTime = await getNextTimePost();
        }
      }
      nextTime = nextTime + randomMinutes;
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
    addLog({
      vi: "Lỗi khi tạo bộ lập lịch tự động",
      en: "Error create scheduler auto",
    });
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

let timeoutId = null;

/**
 *  @description This function clear scheduler auto and create scheduler auto again,
 * must user is not spammed and not in progress
 * if user is spammed, set next time post when spammed
 * else set next time post
 */
async function clearAndCreateSchedulerAlarm() {
  try {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const isProgress = (await getProgress()) || false;
    if (isProgress) {
      logActions("is progress, skip create scheduler auto");
      addLog({
        vi: "Tiện ích đang trong quá trình xử lý, bỏ qua tạo bộ lập lịch tự động",
        en: "Tool is processing, skip create scheduler auto",
      });
      return;
    }

    clearSchedulerAuto();
    const isSpammed = await DB_getValue(KEY_IS_SPAMMED);
    const timeSpammed = await getNextTimePostWhenSpammed();
    const time = await getNextTimePost();

    timeoutId = setTimeout(() => {
      createSchedulerAuto(isSpammed ? timeSpammed : time);
    }, 2000);
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
