import {
  KEY_IS_SPAMMED,
  KEY_IS_TEST,
  KEY_NEXT_TIME_POST_WHEN_SPAMMED,
  SCHEDULER_TYPE,
} from "../../../contants/contants.js";
import { logActions, logError, random } from "../../../utils/utils.js";
import {
  getSchedulerService,
  setSchedulerService,
} from "../services/scheduler-service.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";

/**
 *
 * @param {Array<{h: number, m: number}>} schedulerTimes
 * @param {number|null} hours
 * @param {number|null} minutes
 * @returns
 */
function checkIsInTime(schedulerTimes, hours, minutes) {
  if (!hours) {
    hours = new Date().getHours();
  }

  if (!minutes) {
    minutes = new Date().getMinutes();
  }

  for (const time of schedulerTimes) {
    if (hours === time.h && minutes === time.m) {
      return true;
    }
  }

  return false;
}

async function checkScheduler() {
  const scheduler = await getSchedulerService();
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  switch (scheduler.type) {
    case SCHEDULER_TYPE.DAILY_HOURS:
      return checkIsInTime(scheduler.dailyHours, hours, minutes);
    case SCHEDULER_TYPE.EVERY_MINUTES:
      return checkIsInTime(scheduler.schedulerMinutes, hours, minutes);
    case SCHEDULER_TYPE.EVERY_HOURS:
      return checkIsInTime(scheduler.schedulerHours, hours, minutes);
    case SCHEDULER_TYPE.FRAME_HOURS:
      return checkIsInTime(scheduler.frameHours, hours, minutes);
    default:
      return false;
  }
}

async function createSchedulerMinutes(val) {
  // Implementation for creating scheduler minutes
  val = Number(val);
  if (val < 0) {
    val = 1;
  }
  const newScheduler = [];
  const now = new Date();
  const oneMinute = 60 * 1000;
  let nextTime = new Date(now.setHours(0, 0, 0, 0));
  let day = nextTime.getDate();
  const nextDay = day + 1;

  let i = 0;

  while (day < nextDay && i < 1000) {
    nextTime = new Date(nextTime.getTime() + (val + random(0, 3)) * oneMinute);
    day = nextTime.getDate();
    if (day < nextDay) {
      const h = nextTime.getHours();
      const m = nextTime.getMinutes();
      newScheduler.push({ h, m });
    }

    ++i;
  }

  newScheduler.sort((a, b) => {
    if (a.h === b.h) return a.m - b.m;
    return a.h - b.h;
  });

  return newScheduler;
}

function createSchedulerHours(val) {
  // Implementation for creating scheduler hours
  val = Number(val);
  if (val < 1) val = 1;
  if (val > 23) val = 23;
  const newScheduler = [];
  const now = new Date();
  const oneHours = 60 * 60 * 1000;
  let nextTime = new Date(now.setHours(0, 0, 0, 0));
  let day = nextTime.getDate();
  const nextDay = day + 1;

  let i = 0;

  while (day < nextDay && i < 1000) {
    nextTime = new Date(
      nextTime.getTime() + val * oneHours + random(-7, 7) * 1000 * 60,
    );
    day = nextTime.getDate();
    if (day < nextDay) {
      const h = nextTime.getHours();
      const m = nextTime.getMinutes();
      newScheduler.push({ h, m });
    }

    ++i;
  }

  newScheduler.sort((a, b) => {
    if (a.h === b.h) {
      return a.m - b.m;
    }
    return a.h - b.h;
  });

  return newScheduler;
}

function createSchedulerDailyHours() {
  const newScheduler = [];
  for (let i = 0; i < 24; i++) {
    newScheduler.push({ h: i, m: 0 });
  }
  return newScheduler;
}

async function getSchedulerWithType(type) {
  const scheduler = await getSchedulerService();
  if (!type) {
    type = scheduler.type;
  }
  switch (type) {
    case "daily-hours":
      return scheduler.dailyHours;
    case "custom-every-minutes":
      return scheduler.schedulerMinutes;
    case "custom-every-hours":
      return scheduler.schedulerHours;
    case "custom-frame-hours":
      return scheduler.frameHours;
    default:
      return [];
  }
}

function convertFrameHours(val) {
  if (!val || typeof val !== "string") {
    throw new Error("Invalid value for frame hours");
  }
  if (!val.includes(":")) {
    throw new Error(
      "Invalid format for frame hours, expected format: '1:00,2:00,...'",
    );
  }

  const time = val.split(":");

  const h = Number(time[0].trim());
  const m = Number(time[1].trim());

  if (
    Number.isNaN(h) ||
    Number.isNaN(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    throw new Error(
      "Invalid format for frame hours, hours and minutes should be numbers",
    );
  }

  return { h: Number(time[0].trim()), m: Number(time[1].trim()) };
}

function getListFrameHours(strs) {
  try {
    if (!strs || typeof strs !== "string") {
      throw new Error("Invalid value for frame hours");
    }
    const times = strs.split(",").map((s) => s.trim());
    const frameHours = [];
    for (const time of times) {
      const { h, m } = convertFrameHours(time);
      frameHours.push({ h, m });
    }
    return frameHours;
  } catch (error) {
    throw error;
  }
}

async function getNextTimePost() {
  try {
    const schedulers = await getSchedulerWithType();
    if (!schedulers || !schedulers.length) {
      return null;
    }
    const now = Date.now();
    let ans = null;
    const oneMinute = 1000 * 60;
    const isTest = await DB_getValue(KEY_IS_TEST);
    let diff = oneMinute;
    if (!isTest) {
      diff = oneMinute * 4;
    }
    for (const time of schedulers) {
      const t = new Date(new Date().setHours(time.h, time.m, 0, 0)).getTime();
      if (t > now + diff) {
        ans = t;
        break;
      }
    }
    if (!ans) {
      ans = new Date(new Date().setDate(new Date().getDate() + 1)).setHours(
        schedulers[0].h,
        schedulers[0].m,
        0,
        0,
      );
    }
    if (!ans) {
      ans = new Date().getTime() + oneMinute * 60;
    }
    return ans;
  } catch (error) {
    logError("Error at getNextTimePost: ", error);
    return null;
  }
}

async function shuffleTimes() {
  function shuffle(times = [], diff = 0) {
    const set = new Set();
    try {
      const newTimes = [];
      times.forEach((item) => {
        let m = item.m + diff;
        let h = item.h;
        if (m < 0) {
          h--;
          if (h < 0) {
            h = 23;
          }
          m = 60 + m;
        }
        if (m > 59) {
          h++;
          if (h > 23) {
            h = 0;
          }
          m = m - 60;
        }

        if (!set.has(`${h}:${m}`)) {
          set.add(`${h}:${m}`);
          newTimes.push({
            h,
            m,
          });
        }
      });

      newTimes.sort((a, b) => {
        if (a.h === b.h) return a.m - b.m;
        return a.h - b.h;
      });
      return newTimes;
    } catch (error) {
      logError("Error at shuffle times: ", error);
      return [];
    }
  }

  const scheduler = await getSchedulerService();
  const type = scheduler.type;
  const rand = random(0, 10);
  const diff = random(-2, 2);
  const per = 8;
  if (rand > per) {
    if (
      type === SCHEDULER_TYPE.EVERY_MINUTES ||
      type === SCHEDULER_TYPE.EVERY_HOURS
    ) {
      logActions("Shuffle scheduler times");
      const times =
        type === SCHEDULER_TYPE.EVERY_MINUTES
          ? [...scheduler.schedulerMinutes]
          : [...scheduler.schedulerHours];

      const newTimes = shuffle(times, diff);

      if (type === SCHEDULER_TYPE.EVERY_MINUTES) {
        scheduler.schedulerMinutes = newTimes;
      } else {
        scheduler.schedulerHours = newTimes;
      }
      setSchedulerService(scheduler);
    }
  }
}

async function getNextTimePostWhenSpammed() {
  let nextTime = await DB_getValue(KEY_NEXT_TIME_POST_WHEN_SPAMMED);
  if (!nextTime) {
    nextTime = new Date().getTime() + 1000 * 60 * 60 * 24 * 2;
    await DB_setValue(KEY_NEXT_TIME_POST_WHEN_SPAMMED, nextTime);
  }
  return nextTime;
}

async function getCorrectNextTime() {
  try {
    const isSpammed = await DB_getValue(KEY_IS_SPAMMED);
    if (isSpammed) {
      return await getNextTimePostWhenSpammed();
    }
    return await getNextTimePost();
  } catch (error) {
    logError("Error at getCorrectNextTime method: ", error);
    return null;
  }
}
export {
  checkScheduler,
  getListFrameHours,
  createSchedulerMinutes,
  createSchedulerHours,
  createSchedulerDailyHours,
  getSchedulerWithType,
  convertFrameHours,
  getNextTimePost,
  shuffleTimes,
  getNextTimePostWhenSpammed,
  getCorrectNextTime,
};
