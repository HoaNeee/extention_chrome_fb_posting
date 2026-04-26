import {
  KEY_GROUPS_NEED_POST,
  KEY_GROUPS_POSTED,
  KEY_IS_TEST,
  KEY_STOP_TASK,
  KEY_POST,
  KEY_IS_SHOW_DASHBOARD,
  isDashboardTab,
  isPostTab,
  KEY_QUEUE,
  KEY_POST_LENGTH,
  KEY_IS_DEVELOPER_MODE,
} from "./contants.js";

import { logActions, logError, now, random, sleep } from "./utils/utils.js";

import {
  clickOutSideHideDialog,
  getAllFieldsSetting,
  getIsExistDialog,
} from "./helpers/elementDom.js";

import { postHelper, nextTask } from "./helpers/post.js";

import { clearIntervalScheduler } from "./helpers/scheduler.js";

import { createPanel } from "./draw_element/panel.js";

import { initialData } from "./helpers/initial.js";

import {
  getAllGroupPostedsInStorage,
  getProgress,
  getQueueInStorage,
  setProgress,
} from "./helpers/storage.js";

import {
  showDashboardListener,
  processListener,
  testingListener,
  groupChangeListener,
  stopTaskListener,
  schedulerChangeListener,
} from "./listener/index.js";
import scrollDetectListGroupListener from "./listener/scrollDetectListGroup.js";
import { automation } from "./helpers/automation.js";
import postListener from "./listener/postListener.js";
import {
  checkPostedAllGroupOrMaxGroupPerTime,
  resetPostedGroupAndSave,
} from "./helpers/group.js";
import { devModeListener } from "./listener/devMode.js";

(async function () {
  "use strict";
  console.log("user-script is runninggggg");

  try {
    const { root, showDashboard, hideDashboard } = await createPanel(
      document.body,
    );

    const { setIsTest, setIsProcessing, setIsScrollDetectListGroup } =
      getAllFieldsSetting();

    logActions(
      isDashboardTab
        ? "this is dash board tab"
        : isPostTab
          ? "this is post tab"
          : "this is other tab",
    );

    //show or hide dashboard
    const isShow = await GM_getValue(KEY_IS_SHOW_DASHBOARD);
    if (!isShow) {
      hideDashboard();
    }

    showDashboardListener(hideDashboard, showDashboard);

    processListener(setIsProcessing);

    testingListener(setIsTest);

    scrollDetectListGroupListener(setIsScrollDetectListGroup);

    //initial data
    await initialData({ anchorElement: root });

    //observe list groups (open if first group)
    GM_addValueChangeListener(KEY_GROUPS_NEED_POST, groupChangeListener);

    //fix root show after initial data, avoid flash screen
    root.style.display = "block";

    //try another way: open new tab -> reload
    const taskObject = await GM_getValue(KEY_POST);
    if (taskObject) {
      const task = taskObject?.task;
      const posteds = await getAllGroupPostedsInStorage();
      const isInProgress = await getProgress();
      logActions("posteds:", posteds);
      logActions("current task:", task);

      const isStopTask = await GM_getValue(KEY_STOP_TASK);

      if (isPostTab && task && isInProgress) {
        if (task.status === "pending" && !isStopTask) {
          //check max group per time
          const { isPostedAll, isPostedMaxGroupPerTime } =
            await checkPostedAllGroupOrMaxGroupPerTime();
          if (isPostedAll || isPostedMaxGroupPerTime) {
            GM_setValue(KEY_POST_LENGTH, 0);
            setProgress(false);
            if (isPostedAll) {
              await resetPostedGroupAndSave();
            }
            return;
          }

          GM_setValue(KEY_POST, {
            task: { ...task, status: "selecting" },
            time: now(),
          });
          const isPosted = posteds?.some((h) => h === task.id_href);
          if (!isPosted) {
            //wait for load page
            await sleep(random(4, 6) * 1000);

            //simulate post
            try {
              await postHelper(task);
            } catch (error) {
              logError("Error at postHelper: " + error);
            }
            posteds.push(task.id_href);
            GM_setValue(KEY_GROUPS_POSTED, posteds);
          }

          //force next
          try {
            await nextTask(task);
          } catch (error) {
            setProgress(false);
            logError("Error at nextTask: " + error);
          }
        }

        //close tab
        const isTest = await GM_getValue(KEY_IS_TEST);
        if (!isTest) {
          setTimeout(() => {
            const isExistDialog = getIsExistDialog();
            if (isExistDialog) {
              clickOutSideHideDialog();
            }
          }, 1000 * 15); //15 seconds
          setTimeout(
            () => {
              // window.close();
              chrome.runtime.sendMessage({
                type: "CLOSE_THIS_TAB",
              });
            },
            random(35, 55) * 1000, //35-55 seconds
          );
        } else {
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: "CLOSE_THIS_TAB",
            });
          }, 1000 * 10);
        }
      }
    }

    //listen change scheduler
    schedulerChangeListener();

    //check stop task
    stopTaskListener(clearIntervalScheduler);

    //task
    GM_addValueChangeListener(KEY_POST, postListener);

    //check dev mode
    GM_addValueChangeListener(KEY_IS_DEVELOPER_MODE, devModeListener);

    // check task queue when reload page
    const objectQueue = await getQueueInStorage();
    const queue = objectQueue.queue;
    if (queue && queue.length) {
      const time = objectQueue?.time;
      const nowTime = now();
      const exprireTime = time + 1000 * 5; //5 seconds
      if (exprireTime < nowTime) {
        logActions("Task queue expired, clear queue");
        GM_setValue(KEY_QUEUE, { queue: [], time: now() });
      } else {
        logActions("Processing task queue...", queue);
        await sleep(2000);
        while (!queue.isEmpty()) {
          try {
            const task = queue.peek();

            switch (task.name) {
              case "automation":
                const { forceChange, isTest } = task.data;
                await automation({ forceChange, isTest });
                break;
              case "getListGroups":
                logActions("Start get list groups...");
                break;
              default:
                logActions("No handler for task: " + task.name);
                break;
            }

            queue.pop();
          } catch (error) {
            logError("Error processing task: " + error);
            break;
          }
        }
      }
    }
  } catch (e) {
    setProgress(false);
    logError("Error at main: ", e);
  }

  //end-script
})();
