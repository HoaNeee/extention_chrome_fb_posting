import {
  KEY_ALL_GROUPS,
  KEY_COUNT_POST,
  KEY_COUNT_RESET_GROUPS,
  KEY_IS_DEVELOPER_MODE,
  KEY_IS_IN_PROGRESS,
  KEY_IS_SHUFFLE_GROUPS_NEED_POST,
  KEY_IS_SHUFFLE_SCHEDULER_TIME,
  KEY_IS_SPAMMED,
  KEY_IS_TEST,
  KEY_LAST_TIME_POST,
  KEY_MAX_GROUP_PER_TIME,
  KEY_POST,
  KEY_POST_LENGTH,
  prefix,
} from "../../../contants/contants.js";
import {
  getCurrentGroupNeedPost,
  getTimeToPostOneGroup,
  getTotalGroupsNeedPost,
} from "../helpers/group.js";
import {
  getNextTimePost,
  getNextTimePostWhenSpammed,
} from "../helpers/scheduler.js";
import { DB_getValue } from "../utils/api-helper.js";
import { getTextWithLanguage, logError } from "../../../utils/utils.js";
import {
  getAllGroupPostedsInStorage,
  getListGroupsNeedPostInStorage,
} from "../services/groupService.js";
import { getSchedulerService } from "../services/scheduler-service.js";
import {
  getIsFixStealAllFocusInStorage,
  getIsStealFocusInStorage,
} from "../helpers/storage.js";

function getDataSavedHTML({
  allGroups = [],
  groupsNeedPost = [],
  groupsPosted = [],
  lengthPostedInCurrentTime = 0,
  isTesting = false,
  isProcessing = false,
  isScheduler = false,
  currentGroup = {},
  lastTimePost = 0,
  currentGroupNeedPost = {
    id: "",
    groups: [],
    title: "",
  },
  nextTimePost = 0,
  isDeveloperMode = false,
  maxGroupPerTime = 0,
  countResetGroups = 0,
  estimatedTotalTime = null,
  isFixStealFocus = false,
  isShuffleTime = false,
  isSpammed = false,
  nextTimeWhenSpammed = 0,
  countBatch = 0,
  isShuffleGroupsNeedPost = false,
}) {
  /*
    type of current group: {
      id_href: string,
      time: number,
      status: string //pending, selecting, posting, done
    }
  */

  function enabledString(val) {
    return val
      ? `<b>${getTextWithLanguage({ vi: "Đang bật", en: "Enabled" })}</b>`
      : `<b>${getTextWithLanguage({ vi: "Đang tắt", en: "Disabled" })}</b>`;
  }

  function colorByDisabled(val) {
    return val ? "var(--tm-text-success)" : "var(--tm-text-danger)";
  }

  function colorByStatus(status) {
    switch (status) {
      case "pending":
        return "orange";
      case "selecting":
        return "blue";
      case "posting":
        return "purple";
      case "done":
        return "var(--tm-text-success)";
      case "error":
        return "var(--tm-text-danger)";
      default:
        return "var(--tm-text-primary)";
    }
  }

  function getStatusString(status) {
    switch (status) {
      case "pending":
        return getTextWithLanguage({ vi: "Đang chờ", en: "Pending" });
      case "selecting":
        return getTextWithLanguage({ vi: "Đang chọn", en: "Selecting" });
      case "posting":
        return getTextWithLanguage({ vi: "Đang đăng", en: "Posting" });
      case "done":
        return getTextWithLanguage({ vi: "Đã đăng", en: "Done" });
      case "error":
        return getTextWithLanguage({ vi: "Lỗi", en: "Error" });
      default:
        return status;
    }
  }

  const set = new Set();
  groupsNeedPost.forEach((item) => {
    for (const it of item.groups) {
      set.add(it.id_href);
    }
  });

  let totalGroupsNeedPost = set.size;

  const postedsSet = new Set(groupsPosted);

  const totalCurrentGroupsPosted =
    currentGroupNeedPost?.groups?.filter((group) => {
      return postedsSet.has(group.id_href || group.href || group.id);
    })?.length || 0;

  const nextTime = isSpammed
    ? new Date(nextTimeWhenSpammed)
    : new Date(nextTimePost);

  let estimatedTotalTimeText = getTextWithLanguage({
    vi: "Đang tính toán...",
    en: "Calculating...",
  });

  if (estimatedTotalTime && estimatedTotalTime >= 0) {
    estimatedTotalTime = Math.ceil(estimatedTotalTime / 60);
    const minutes = estimatedTotalTime % 60;
    const hours = Math.floor(estimatedTotalTime / 60);
    estimatedTotalTimeText = getTextWithLanguage({
      vi: `${hours} giờ ${minutes} phút`,
      en: `${hours} hours ${minutes} minutes`,
    });
  }

  const forDevHtml = isDeveloperMode
    ? `
    <div id="${prefix}is-testing-status">${getTextWithLanguage({ vi: "Đang kiểm thử", en: "Is Testing" })}: <span style="color: ${colorByDisabled(isTesting)};">${enabledString(isTesting)}</span></div>
          <div id="${prefix}is-developer-mode-status">${getTextWithLanguage({ vi: "Chế độ nhà phát triển", en: "Developer Mode" })}: <span style="color: ${colorByDisabled(isDeveloperMode)};">${enabledString(isDeveloperMode)}</span></div>
  `
    : "";

  return `
        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 16px; font-size: 13px">
          <div>${getTextWithLanguage({ vi: "Tổng số nhóm", en: "Total Groups" })}: <b>${allGroups.length}</b></div>
          <div>${getTextWithLanguage({ vi: "Số nhóm cần đăng", en: "Total Groups Need Post" })}: <b>${totalGroupsNeedPost}</b></div>
          <div>${getTextWithLanguage({ vi: "Số nhóm đã đăng", en: "Total Groups Posted" })}: <b>${groupsPosted.length}</b></div>
          <div>${getTextWithLanguage({ vi: "Hiện tại đang đăng", en: "Total Current Groups Posted" })}: <b>${lengthPostedInCurrentTime}/${maxGroupPerTime}</b></div>
          <div>${getTextWithLanguage({ vi: "Nhóm hiện tại cần đăng", en: "Total Current Need Post" })}: <b>${currentGroupNeedPost?.groups?.length || 0}</b></div>
          <div>${getTextWithLanguage({ vi: "Nhóm hiện tại đã đăng", en: "Total Current Groups Posted" })}: <b>${totalCurrentGroupsPosted}</b></div>
          <div>${getTextWithLanguage({ vi: "Số lần đặt lại nhóm", en: "Count Reset Groups" })}: <b>${countResetGroups}</b></div>
          <div>${getTextWithLanguage({ vi: "Đợt đăng hiện tại", en: "Current Batch" })}: <b>${countBatch}</b></div>
          <div>${getTextWithLanguage({ vi: "Tên nhóm hiện tại", en: "Current Group title" })}: ${currentGroupNeedPost?.name || currentGroupNeedPost?.title || "N/A"}</div>
          <div id="${prefix}is-spammed-status">${getTextWithLanguage({ vi: "Đang bị spam", en: "Is Spammed" })}: <span style="color: ${isSpammed ? "var(--tm-text-danger)" : "var(--tm-text-success)"};"><b>${getTextWithLanguage({ vi: isSpammed ? "Có" : "Không", en: isSpammed ? "Yes" : "No" })}</b></span></div>
          <div id="${prefix}is-processing-status">${getTextWithLanguage({ vi: "Đang chạy auto", en: "Is Processing" })}: <span style="color: ${colorByDisabled(isProcessing)};">${enabledString(isProcessing)}</span></div>
          <div id="${prefix}is-scheduler-status">${getTextWithLanguage({ vi: "Đang lên lịch", en: "Is Scheduler" })}: <span style="color: ${colorByDisabled(isScheduler)};">${enabledString(isScheduler)}</span></div>
          <div id="${prefix}is-fix-steal-focus-status">${getTextWithLanguage({ vi: "Tránh nhảy tab", en: "Is Fix Steal Focus" })}: <span style="color: ${colorByDisabled(isFixStealFocus)};">${enabledString(isFixStealFocus)}</span></div>
          <div id="${prefix}is-shuffle-groups-need-post-status">${getTextWithLanguage({ vi: "Trộn nhóm cần đăng", en: "Is Shuffle Groups Need Post" })}: <span style="color: ${colorByDisabled(isShuffleGroupsNeedPost)};">${enabledString(isShuffleGroupsNeedPost)}</span></div>
          <div id="${prefix}is-shuffle-time-status">${getTextWithLanguage({ vi: "Trộn lịch đăng", en: "Is Shuffle Time" })}: <span style="color: ${colorByDisabled(isShuffleTime)};">${enabledString(isShuffleTime)}</span></div>
          ${forDevHtml}
          <div style="word-break: break-word;">${getTextWithLanguage({ vi: "Nhóm hiện tại", en: "Current Group" })}: ${currentGroup?.id_href || getTextWithLanguage({ en: "Available", vi: "Không có sẵn" })}</div>
          <div>${getTextWithLanguage({ vi: "Trạng thái nhóm hiện tại", en: "Current Group status" })}: <span style="color: ${colorByStatus(currentGroup?.status)};"> <b>${getStatusString(currentGroup?.status || getTextWithLanguage({ en: "Available", vi: "Không có sẵn" }))}</b></span></div>
					<div>${getTextWithLanguage({ vi: "Bài đăng gần nhất", en: "Last time post" })}: ${lastTimePost ? new Date(lastTimePost).toLocaleString() : "N/A"}</div>
          <div>${getTextWithLanguage({ vi: "Thời gian đăng tiếp theo", en: "Next time post" })}: ${nextTimePost ? `${nextTime.getHours()}:${nextTime.getMinutes()} ${isScheduler ? (isSpammed ? `(${nextTime.toLocaleDateString()})` : `(${getTextWithLanguage({ vi: "Độ trễ vài đơn vị", en: "Several units of delay" })})`) : getTextWithLanguage({ vi: "(Lên lịch đang tắt)", en: "(Scheduler is off)" })}` : "N/A"}</div>
          <div>${getTextWithLanguage({
            vi: "Thời gian dự kiến đăng tất cả nhóm",
            en: "Estimated time to post all groups",
          })}: <b>${estimatedTotalTimeText}</b></div>
        </div>
      `;
}

async function updateDataSavedInfo() {
  try {
    const rootElement = document.querySelector("#tm_root");

    if (!rootElement) return;

    const dataSavedEl = rootElement.querySelector("#tm_data-saved-info");
    if (dataSavedEl) {
      const { groups: groupsNeedPost } = await getListGroupsNeedPostInStorage();
      const scheduler = await getSchedulerService();
      const allGroups = (await DB_getValue(KEY_ALL_GROUPS)) || [];
      const groupsPosted = await getAllGroupPostedsInStorage();
      const isTesting = (await DB_getValue(KEY_IS_TEST)) || false;
      const isProcessing = (await DB_getValue(KEY_IS_IN_PROGRESS)) || false;
      const length = (await DB_getValue(KEY_POST_LENGTH)) || 0;
      const objectTask = (await DB_getValue(KEY_POST)) || {};
      const lastTimePost = (await DB_getValue(KEY_LAST_TIME_POST)) || 0;
      const currentGroupNeedPost = await getCurrentGroupNeedPost();
      const maxGroupPerTime = (await DB_getValue(KEY_MAX_GROUP_PER_TIME)) || 0;
      const isFixStealFocus =
        (await getIsStealFocusInStorage()) ||
        (await getIsFixStealAllFocusInStorage()) ||
        false;
      const isShuffleTime =
        (await DB_getValue(KEY_IS_SHUFFLE_SCHEDULER_TIME)) || false;

      let nextTime = await getNextTimePost();

      function getSpaceTimePost(scheduler) {
        switch (scheduler.type) {
          case "custom-every-hours":
            return scheduler.valueHours * 60 * 60;
          case "custom-every-minutes":
            return scheduler.valueMinutes * 60;
          case "daily-hours":
            return 1 * 60 * 60;
          case "custom-frame-hours":
            return null;
          default:
            return null;
        }
      }

      //calulate time estimated total time post
      const timeToPostOneGroup = await getTimeToPostOneGroup();
      const timeSpacePost = getSpaceTimePost(scheduler);

      let estimatedTotalTime = null;

      if (timeSpacePost !== undefined && timeSpacePost !== null) {
        const totalGroupNeedPost = await getTotalGroupsNeedPost();

        estimatedTotalTime =
          totalGroupNeedPost * timeToPostOneGroup +
          ((totalGroupNeedPost - groupsPosted.length) / maxGroupPerTime) *
            timeSpacePost;
      }

      const html = getDataSavedHTML({
        allGroups,
        groupsNeedPost,
        groupsPosted,
        lengthPostedInCurrentTime: length,
        isTesting,
        isProcessing,
        isScheduler: scheduler?.isScheduler,
        currentGroup: objectTask?.task || {},
        lastTimePost,
        currentGroupNeedPost,
        nextTimePost: nextTime,
        isDeveloperMode: (await DB_getValue(KEY_IS_DEVELOPER_MODE)) || false,
        maxGroupPerTime,
        countResetGroups: (await DB_getValue(KEY_COUNT_RESET_GROUPS)) || 0,
        estimatedTotalTime,
        isFixStealFocus,
        isShuffleTime,
        isSpammed: (await DB_getValue(KEY_IS_SPAMMED)) || false,
        nextTimeWhenSpammed: await getNextTimePostWhenSpammed(),
        countBatch: (await DB_getValue(KEY_COUNT_POST)) || 0,
        isShuffleGroupsNeedPost:
          (await DB_getValue(KEY_IS_SHUFFLE_GROUPS_NEED_POST)) || false,
      });
      dataSavedEl.innerHTML = html;
    }
  } catch (error) {
    logError("Error update data saved info: ", error);
  }
}

export { updateDataSavedInfo };
