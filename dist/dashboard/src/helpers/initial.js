import {
  getLanguageInStorage,
  getStrictlyMatchTitleGroupInStorage,
  getTimeDelayInStorage,
} from "./storage.js";
import {
  disabledElement,
  enabledElement,
  getAllFieldsSetting,
  hideElement,
  hideField,
  showElement,
  showField,
} from "./elementDom.js";
import {
  KEY_GROUPS_POSTED,
  KEY_IS_IN_PROGRESS,
  KEY_IS_TEST,
  KEY_MAX_GROUP_PER_TIME,
  MAX_GROUP_PER_TIME_INITIAL,
  KEY_INDEXS_GROUP_CHECKED,
  KEY_GROUPS_NEED_POST,
  initialTimeDelay,
  KEY_IS_FIX_STEAL_FOCUS,
  KEY_IS_DARK_THEME,
  KEY_IS_DEVELOPER_MODE,
  SCHEDULER_TYPE,
  KEY_IS_SHUFFLE_SCHEDULER_TIME,
  KEY_IS_SPAMMED,
  KEY_NEXT_TIME_POST_WHEN_SPAMMED,
  KEY_IS_FIX_STEAL_ALL_FOCUS,
  KEY_IS_SHUFFLE_GROUPS_NEED_POST,
} from "../../../contants/contants.js";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo.js";
import {
  getIsDashboardTab,
  logActions,
  logError,
  random,
} from "../../../utils/utils.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";
import { getDataSavedInStorage } from "../services/dataSavedService.js";
import {
  clearAndCreateSchedulerAlarm,
  clearSchedulerAuto,
  createSchedulerAuto,
  getSchedulerService,
  setSchedulerService,
} from "../services/scheduler-service.js";
import { getNextTimePostWhenSpammed, shuffleTimes } from "./scheduler.js";
import { initHistoryLogs } from "../draw_element/panel-log.js";

async function initialData({ anchorElement = document.body }) {
  try {
    async function initialSettings() {
      const {
        setMaxGroupPerTime,
        setIsTest,
        setIsProcessing,
        setScheduler: setSchedulerSetting,
        setIsFixStealFocus,
        setStrictlyMatchTitleGroup,
        setIsShuffleSchedulerTime,
        setIsSpammed,
        setIsFixStealAllFocus,
        setIsShuffleGroupsNeedPost,
      } = getAllFieldsSetting();

      //get max group
      let maxGroup = await DB_getValue(KEY_MAX_GROUP_PER_TIME);
      if (!maxGroup) {
        maxGroup = MAX_GROUP_PER_TIME_INITIAL;
        DB_setValue(KEY_MAX_GROUP_PER_TIME, maxGroup);
      }

      setMaxGroupPerTime(maxGroup);

      const isTesting = (await DB_getValue(KEY_IS_TEST)) || false;
      setIsTest(isTesting);

      const isProcessing = (await DB_getValue(KEY_IS_IN_PROGRESS)) || false;
      setIsProcessing(isProcessing);

      const isFixStealFocus =
        (await DB_getValue(KEY_IS_FIX_STEAL_FOCUS)) || false;
      setIsFixStealFocus(isFixStealFocus);

      const isFixStealAllFocus =
        (await DB_getValue(KEY_IS_FIX_STEAL_ALL_FOCUS)) || false;
      setIsFixStealAllFocus(isFixStealAllFocus);

      const isSpammed = (await DB_getValue(KEY_IS_SPAMMED)) || false;
      setIsSpammed(isSpammed);

      const isShuffleSchedulerTime =
        (await DB_getValue(KEY_IS_SHUFFLE_SCHEDULER_TIME)) || false;
      setIsShuffleSchedulerTime(isShuffleSchedulerTime);

      const isShuffleGroupsNeedPost =
        (await DB_getValue(KEY_IS_SHUFFLE_GROUPS_NEED_POST)) || false;
      setIsShuffleGroupsNeedPost(isShuffleGroupsNeedPost);

      const scheduler = await getSchedulerService();

      if (scheduler) {
        const isCheduler = scheduler.isScheduler || false;
        if (isCheduler) {
          setSchedulerSetting(isCheduler);
          clearAndCreateSchedulerAlarm();
        } else {
          clearSchedulerAuto();
        }

        //shuffle time
        if (getIsDashboardTab(location.href) && isShuffleSchedulerTime) {
          shuffleTimes();
        }
      }

      const strictlyMatchTitleGroup =
        await getStrictlyMatchTitleGroupInStorage();
      if (strictlyMatchTitleGroup) {
        setStrictlyMatchTitleGroup(strictlyMatchTitleGroup);
      }
    }

    await initialSettings();

    const listGroups = (await DB_getValue(KEY_GROUPS_NEED_POST)) || [];
    logActions("Initial list groups need post: ", listGroups);
    const dataSaved = (await getDataSavedInStorage()) || [];
    logActions("Initial data saved: ", dataSaved);

    //initial indexs checked
    const listGroupsContainer = anchorElement.querySelector(
      "#tm_list-groups-container",
    );
    if (listGroupsContainer) {
      const firstChild = listGroupsContainer.firstElementChild;
      if (firstChild) {
        const childs = firstChild.children || [];
        const indexsCheckeds =
          (await DB_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];
        logActions("Initial indexs checked: ", indexsCheckeds);
        for (const child of childs) {
          const id = child.getAttribute("data-group-id");
          if (id && indexsCheckeds.includes(id)) {
            const input = child.querySelector("input[type=checkbox]");
            if (input) {
              input.checked = true;
            }
          }
        }
      }
    }

    async function initialInputTimeDelay() {
      const timeDelay = await getTimeDelayInStorage();

      const inputClickToPost = anchorElement.querySelector(
        `#tm_input-delay-click-to-post`,
      );
      const inputFillContent = anchorElement.querySelector(
        `#tm_input-delay-fill-content`,
      );
      const inputFillFile = anchorElement.querySelector(
        `#tm_input-delay-fill-file`,
      );
      const inputOpenNewTab = anchorElement.querySelector(
        `#tm_input-delay-open-new-tab`,
      );
      const inputDelayPost =
        anchorElement.querySelector(`#tm_input-delay-post`);
      if (inputClickToPost) {
        inputClickToPost.value =
          timeDelay.clickToPost || initialTimeDelay.clickToPost;
      }
      if (inputFillContent) {
        inputFillContent.value =
          timeDelay.fillContent || initialTimeDelay.fillContent;
      }
      if (inputFillFile) {
        inputFillFile.value = timeDelay.fillFile || initialTimeDelay.fillFile;
      }
      if (inputDelayPost) {
        inputDelayPost.value = timeDelay.post || initialTimeDelay.post;
      }
      if (inputOpenNewTab) {
        inputOpenNewTab.value =
          timeDelay.openNewTab || initialTimeDelay.openNewTab;
      }
    }

    await initialInputTimeDelay();

    const isDarkTheme = (await DB_getValue(KEY_IS_DARK_THEME)) || false;
    const body = document.querySelector(`body`);
    if (isDarkTheme) {
      body?.classList?.add("dark");
      body?.classList?.remove("light");
    } else {
      body?.classList?.remove("dark");
      body?.classList?.add("light");
    }
    const svgs = body.querySelectorAll(".tm_svg");
    svgs.forEach((svg) => {
      svg.setAttribute("fill", isDarkTheme ? "white" : "black");
    });

    const selectLanguage = document.querySelector(`#tm_select-language`);
    const lang = await getLanguageInStorage();
    if (selectLanguage) {
      selectLanguage.value = lang.toLowerCase();
    }

    //...
    const gp = await DB_getValue(KEY_GROUPS_POSTED);
    if (!gp) {
      DB_setValue(KEY_GROUPS_POSTED, []);
    }

    const isDevMode = await DB_getValue(KEY_IS_DEVELOPER_MODE);
    if (isDevMode) {
      showElement("#tm_btn-test-auto");
      showField({
        selector: "#tm_checkbox-is-test",
        fieldSelector: ".tm_field-container",
      });
      showElement("#tm_btn-click");
      showField({
        selector: "#tm_checkbox-is-spammed",
        fieldSelector: ".tm_field-container",
      });
    } else {
      hideElement("#tm_btn-test-auto");
      hideField({
        selector: "#tm_checkbox-is-test",
        fieldSelector: ".tm_field-container",
      });
      hideElement("#tm_btn-click");
      hideField({
        selector: "#tm_checkbox-is-spammed",
        fieldSelector: ".tm_field-container",
      });
    }
    await updateDataSavedInfo();
    await initHistoryLogs();
  } catch (error) {
    logError("Error initialData: " + error);
  }
}

export { initialData };
