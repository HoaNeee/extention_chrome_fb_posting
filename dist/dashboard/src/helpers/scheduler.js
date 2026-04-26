import {
  KEY_ALL_GROUPS,
  KEY_COUNT_NOT_RELOAD_DASHBOARD,
  KEY_COUNT_RELOAD_DASHBOARD,
  KEY_GROUPS_NEED_POST,
  KEY_IS_RELOAD_DASHBOARD,
  KEY_IS_TEST,
  KEY_LAST_TIME_RELOAD_DASHBOARD,
  SCHEDULER_TYPE,
} from "../../../contants/contants.js";
import {
  getIsDashboardTab,
  logActions,
  logError,
  now,
  random,
} from "../utils/utils.js";
import { automation } from "./automation.js";
import {
  checkPostedAllGroupOrMaxGroupPerTime,
  getCurrentGroupNeedPost,
  isPostedAllGroup,
  resetPostedGroupAndSave,
} from "./group.js";
import { openNewTask } from "./post.js";
import {
  getAllGroupPostedsInStorage,
  getProgress,
  getRandomIndexGroupChecked,
  getSchedulerInStorage,
  getSchedulerReloadDashboardInStorage,
  setCurrentIndexGroupPost,
  setProgress,
  setSchedulerInStorage,
  setSchedulerReloadDashboardInStorage,
} from "./storage.js";
import { GM_getValue, GM_setValue } from "../utils/api-helper.js";

let intervalScheduler = null;

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
  const scheduler = await getSchedulerInStorage();
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

async function setIntervalScheduler(root) {
  try {
    clearIntervalScheduler();

    if (!getIsDashboardTab()) {
      return;
    }

    const isTest = (await GM_getValue(KEY_IS_TEST)) || false;

    const timeOutCheckScheduler = isTest ? 6 * 1000 : 60 * 700;

    async function run() {
      try {
        //check is in progress
        if (await getProgress()) {
          return;
        }

        logActions("Check schedule...");
        const isItTime = await checkScheduler();
        if (isItTime) {
          logActions("Its time auto -> on...");
          setProgress(true);

          //This task will be some case:
          //1. not have group need post -> detect group need post again (the first time user using)
          //2. all group posted but not reset -> force reset to pending
          //3. have group need post -> random index group and set to current index group post -> open tab to post

          const allGroups = await GM_getValue(KEY_ALL_GROUPS);

          const objectRaw = await GM_getValue(KEY_GROUPS_NEED_POST);

          if (
            !objectRaw ||
            !objectRaw?.groups ||
            !Array.isArray(objectRaw?.groups) ||
            !objectRaw?.groups.length ||
            !allGroups ||
            !Array.isArray(allGroups)
          ) {
            const isTest = (await GM_getValue(KEY_IS_TEST)) || false;
            let forceChange = false;
            if (!allGroups) {
              forceChange = true;
            }
            await automation({ forceChange, isTest });
            return;
          }

          if (await isPostedAllGroup()) {
            logActions("All groups posted but not reset -> force reset");
            setProgress(false);
            await resetPostedGroupAndSave();
            return;
          }

          const id = await getRandomIndexGroupChecked();
          if (!id) {
            logActions("No group checked -> stop scheduler");
            setProgress(false);
            return;
          }
          setCurrentIndexGroupPost(id);

          let need = (await getCurrentGroupNeedPost()) || [];

          logActions("Groups need post:", need);

          const posteds = await getAllGroupPostedsInStorage();
          const set = new Set(posteds);

          //double check
          const isPostedAll = need?.groups?.every(
            (gr) => gr.status !== "pending" || set.has(gr.id_href),
          );
          if (isPostedAll) {
            const id = await getRandomIndexGroupChecked();
            if (!id) {
              logActions("Reset all groups need post to pending");
              await resetPostedGroupAndSave();
              setProgress(false);
              return;
            }
            setCurrentIndexGroupPost(id);
            need = (await getCurrentGroupNeedPost()) || [];
          }

          const groups = need?.groups || [];

          const task = groups.find(
            (gr) => gr.status === "pending" && !set.has(gr.id_href),
          );

          logActions("Task need post:", task);

          if (task) {
            await openNewTask({ task, isDelay: true });
            // GM_setValue(KEY_POST, { task, time: now() });
            // await sleep(1000);
            // GM_openInTab(task.id_href, { active: true, insert: true });
          } else {
            setProgress(false);
          }
        }
        //maybe reload page here
        else {
          const isReload = await GM_getValue(KEY_IS_RELOAD_DASHBOARD);
          if (isReload) {
            logActions("Check reload dashboard...");
            const schedulerReload =
              await getSchedulerReloadDashboardInStorage();
            const isItTimeReload = checkIsInTime(schedulerReload);
            const lastTimeReload =
              (await GM_getValue(KEY_LAST_TIME_RELOAD_DASHBOARD)) || 0;
            const nowTime = now();
            const diff = nowTime - lastTimeReload;
            //diff > 30 phút -> check
            if (isItTimeReload && diff > 30 * 60 * 1000) {
              const rand = random(0, 10);
              const countNot =
                (await GM_getValue(KEY_COUNT_NOT_RELOAD_DASHBOARD)) || 0;

              //30% chance reload
              if (rand > 7) {
                location.reload();
                const count =
                  (await GM_getValue(KEY_COUNT_RELOAD_DASHBOARD)) || 0;
                GM_setValue(KEY_COUNT_RELOAD_DASHBOARD, count + 1);
              } else {
                if (countNot >= 2) {
                  location.reload();
                  GM_setValue(KEY_COUNT_NOT_RELOAD_DASHBOARD, 0);
                  GM_setValue(KEY_LAST_TIME_RELOAD_DASHBOARD, now());
                } else {
                  GM_setValue(KEY_COUNT_NOT_RELOAD_DASHBOARD, countNot + 1);
                }
              }
            }
          }
        }
      } catch (error) {
        const scheduler = await getSchedulerInStorage();
        setSchedulerInStorage({ ...scheduler, isScheduler: false });
        setProgress(false);
        logActions("Error at checkScheduler: " + error);
        throw new Error("Error at checkScheduler: " + error);
      }
    }

    if (!root) {
      root = document.querySelector("#tm_root");
    }

    intervalScheduler = setInterval(async () => {
      await run();
    }, timeOutCheckScheduler);
    // if (isTest) {
    // } else {
    //   chrome.runtime.sendMessage({
    //     type: "START_SCHEDULER",
    //   });
    // }
  } catch (error) {
    setProgress(false);
    logActions("Error at setIntervalScheduler: " + error);
    throw new Error("Error setIntervalScheduler: " + error);
  }
}

function clearIntervalScheduler() {
  if (intervalScheduler) {
    clearInterval(intervalScheduler);
    logActions("clear intervalScheduler");
  }
  // chrome.runtime.sendMessage({
  //   type: "STOP_SCHEDULER",
  // });
}

async function createSchedulerMinutes(val) {
  // Implementation for creating scheduler minutes
  val = Number(val);
  if (val < 0) {
    val = 1;
  }
  if (val > 59) val = 59;
  const newScheduler = [];
  const now = new Date();
  const oneMinute = 60 * 1000;
  let nextTime = new Date(now.getTime());
  let nextHoursTime = nextTime.getHours();

  let prevTime = new Date(now.getTime());
  let prevHoursTime = prevTime.getHours();

  const set = new Set();

  if (prevHoursTime === nextHoursTime) {
    if (nextHoursTime === 23) {
      while (prevHoursTime !== 0) {
        prevTime = new Date(
          prevTime.getTime() - (val + random(0, 2)) * oneMinute,
        );
        prevHoursTime = prevTime.getHours();
        if (
          !set.has(`${prevTime.getHours()}:${prevTime.getMinutes()}`) &&
          prevHoursTime !== 0
        ) {
          set.add(`${prevTime.getHours()}:${prevTime.getMinutes()}`);
          newScheduler.push({
            h: prevTime.getHours(),
            m: prevTime.getMinutes(),
          });
        }
      }

      if (!set.has(`${now.getHours()}:${now.getMinutes()}`)) {
        newScheduler.push({
          h: now.getHours(),
          m: now.getMinutes(),
        });
      }

      newScheduler.sort((a, b) => {
        if (a.h === b.h) {
          return a.m - b.m;
        }
        return a.h - b.h;
      });

      return newScheduler;
    }
    if (nextHoursTime === 0) {
      while (nextHoursTime !== 23) {
        nextTime = new Date(
          nextTime.getTime() + (val + random(0, 2)) * oneMinute,
        );
        nextHoursTime = nextTime.getHours();
        if (
          !set.has(`${nextTime.getHours()}:${nextTime.getMinutes()}`) &&
          nextHoursTime !== 23
        ) {
          set.add(`${nextTime.getHours()}:${nextTime.getMinutes()}`);
          newScheduler.push({
            h: nextTime.getHours(),
            m: nextTime.getMinutes(),
          });
        }
      }

      if (!set.has(`${now.getHours()}:${now.getMinutes()}`)) {
        newScheduler.push({
          h: now.getHours(),
          m: now.getMinutes(),
        });
      }

      newScheduler.sort((a, b) => {
        if (a.h === b.h) {
          return a.m - b.m;
        }
        return a.h - b.h;
      });

      return newScheduler;
    }
  }

  while (prevHoursTime !== 23) {
    prevTime = new Date(prevTime.getTime() - (val + random(0, 2)) * oneMinute);
    prevHoursTime = prevTime.getHours();
    if (
      !set.has(`${prevTime.getHours()}:${prevTime.getMinutes()}`) &&
      prevHoursTime !== 23
    ) {
      set.add(`${prevTime.getHours()}:${prevTime.getMinutes()}`);
      newScheduler.push({ h: prevTime.getHours(), m: prevTime.getMinutes() });
    }
  }

  while (nextHoursTime !== 0) {
    if (nextHoursTime === 0) break;
    nextTime = new Date(nextTime.getTime() + (val + random(0, 2)) * oneMinute);
    nextHoursTime = nextTime.getHours();
    if (
      !set.has(`${nextTime.getHours()}:${nextTime.getMinutes()}`) &&
      nextHoursTime !== 0
    ) {
      set.add(`${nextTime.getHours()}:${nextTime.getMinutes()}`);
      newScheduler.push({ h: nextTime.getHours(), m: nextTime.getMinutes() });
    }
  }

  if (!set.has(`${now.getHours()}:${now.getMinutes()}`)) {
    newScheduler.push({
      h: now.getHours(),
      m: now.getMinutes(),
    });
  }

  newScheduler.sort((a, b) => {
    if (a.h === b.h) {
      return a.m - b.m;
    }
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
  let nextTime = new Date(now.getTime() + val * oneHours);
  let nextHoursTime = nextTime.getHours();
  const currentMinutes = now.getMinutes();
  const set = new Set();
  for (let i = 0; i < 24; i++) {
    nextTime = new Date(nextTime.getTime() + val * oneHours);
    nextHoursTime = nextTime.getHours();
    set.add(nextHoursTime);
  }
  set.forEach((h) => {
    newScheduler.push({ h, m: currentMinutes + random(0, 5) });
  });

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
  const scheduler = await getSchedulerInStorage();
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

async function createSchedulerReloadDashboard() {
  try {
    const listScheduler = await getSchedulerWithType();

    const newSchedulers = [];

    for (let i = 0; i < 24; i++) {
      const currentTimes = listScheduler.filter((t) => t.h === i);
      if (currentTimes.length) {
        let minM = 59;
        currentTimes.forEach((time) => {
          minM = Math.min(time.m, minM);
        });

        newSchedulers.push({ h: i, m: minM + random(2, 5) });
      } else {
        newSchedulers.push({ h: i, m: random(0, 59) });
      }
    }

    setSchedulerReloadDashboardInStorage(newSchedulers);
  } catch (error) {
    logError("Error at createSchedulerReloadDashboard: " + error);
  }
}

export {
  checkScheduler,
  setIntervalScheduler,
  clearIntervalScheduler,
  getListFrameHours,
  createSchedulerMinutes,
  createSchedulerHours,
  createSchedulerDailyHours,
  getSchedulerWithType,
  convertFrameHours,
  createSchedulerReloadDashboard,
};
