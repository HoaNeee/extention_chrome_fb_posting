const KEY_RETRY_CALL = "retry_call";
const KEY_ALL_GROUPS = "all_groups";
const KEY_POST = "posting";
const KEY_LAST_TIME_POST = "last_time_post";

const KEY_GROUPS_NEED_POST = "groups_need_post";
const KEY_GROUPS_POSTED = "groups_posted";
const KEY_POST_LENGTH = "current_post_length";
const KEY_RE_POST_ALL_GROUP = "re_post_all_group";

const KEY_IS_SHOW_DASHBOARD = "is_show_dashboard";
const KEY_IS_TEST = "is_test";
const KEY_IS_IN_PROGRESS = "is_in_progress";
const KEY_STOP_TASK = "is_stop_task";
const KEY_MAX_GROUP_PER_TIME = "max_group_per_time";
const KEY_SCHEDULER = "scheduler";
const KEY_IS_SHOW_ADVANCE_SETTING = "is_show_advance_setting";
const KEY_IS_SHOW_PANEL_GROUP = "is_show_panel_group";
const KEY_TITLE_STRICTLY_MATCH_GROUP = "title_strictly_match_group";

const KEY_QUEUE = "queue";

const KEY_IS_DEVELOPER_MODE = "is_developer_mode";

const KEY_COUNT_RESET_GROUPS = "count_reset_groups";

/**
 * type: { clickToPost: number, fillContent: number, fillFile: number, post: number, openNewTab: number }
 */
const KEY_TIME_DELAY = "time_delay";

/**
 * type: [
 * 	{id, title,  contents: string[], files: blob[] }
 * ]
 */
const KEY_DATA_POST_SAVED = "data_post_saved";

const KEY_INDEX_GROUP_POST = "current_group_post_index";

/**
 * type: [ id of data group saved ]
 */
const KEY_INDEXS_GROUP_CHECKED = "group_checked_indexs";

const KEY_IS_SCROLL_DETECT_LIST_GROUP = "is_scroll_detect_list_group";

const KEY_IS_FIX_STEAL_FOCUS = "is_fix_steal_focus";
const KEY_IS_FIX_STEAL_ALL_FOCUS = "is_fix_steal_all_focus";

const KEY_IS_SHUFFLE_SCHEDULER_TIME = "is_shuffle_scheduler_time";
const KEY_IS_SHUFFLE_GROUPS_NEED_POST = "is_shuffle_groups_need_post";

const KEY_IS_SPAMMED = "is_spammed";

const KEY_CAN_POST_THIS_TAB = "can_post_this_tab";

const KEY_IS_DARK_THEME = "is_dark_theme";
const KEY_LANGUAGE = "language";

const KEY_NEXT_TIME_POST_WHEN_SPAMMED = "next_time_post_when_spammed";

const KEY_COUNT_POST = "count_post";

const KEY_MY_SIGNATURE = "my_signature";

const APP_NAME = "FB Tools Helper";

const KEY_HISTORY_LOGS = "history_logs";

const KEY_TAB = {
  LAST_TAB_OPEN_ID: "last_tab_open_id",
  TAB_GET_LIST_GROUP_ID: "tab_get_list_group_id",
  LAST_POST_TAB_OPEN_ID: "last_post_tab_open_id",
  TAB_DASHBOARD_ID: "tab_dashboard_id",
};

const MAX_GROUP_PER_TIME_INITIAL = 1;

const STATUS_TASK = {
  PENDING: "pending",
  SELECTING: "selecting",
  DONE: "done",
  POSTING: "posting",
  ERROR: "error",
};

const SCHEDULER_TYPE = {
  EVERY_MINUTES: "custom-every-minutes",
  EVERY_HOURS: "custom-every-hours",
  FRAME_HOURS: "custom-frame-hours",
  DAILY_HOURS: "daily-hours",
};

const URL_DASHBOARD = "https://www.facebook.com/groups/joins/?nav_source=tab";
const URL_TAB_TASK = "https://www.facebook.com/groups/{id}";

const URL_LIST_GROUPS = "https://www.facebook.com/groups/joins/?nav_source=tab";

const MAX_Z_INDEX = 999999999;

const prefix = "tm_";

function getHref() {
  return location.href;
}

const isDashboardTab = getHref() === URL_DASHBOARD;
const isPostTab =
  !isDashboardTab &&
  !getHref().includes("/groups/join") &&
  !getHref().includes("/groups/feed") &&
  !getHref().includes("/groups/discover") &&
  getHref().includes("/groups/");

const initialTimeDelay = {
  clickToPost: 4,
  fillContent: 5,
  fillFile: 7,
  post: 5,
  openNewTab: 2,
};

const SELECTOR = {
  elementsToPost: [`//span[contains(text(), "Write something...")]`],

  elementsPost: [`div[aria-label="Post"][role="button"]`],

  dialog: [`div[role="dialog"]`],

  elementsCloseDialog: [`//div[@aria-label="Close dialog of create tool"]`],

  elementsCreatePost: [`div[aria-label="Create post"][role="dialog"]`],

  elementsTextBoxEditor: [`div[contenteditable="true"][role="textbox"]`],

  elementsSpammed: [
    `//div[contains(text(), "To protect our community from spam, we limit how often you can post, comment, or do other things. Please try again later.")]`,
  ],

  listElementContainers: [`div[aria-label="Preview of a group"][role="main"]`],

  waitingGroups: [`//span[contains(text(),"Request to join group pending")]`],

  allGroupsJoinTexts: [`//span[contains(text(),"All groups you've joined")]`],
};

const SELECTOR_VI = {
  elementsToPost: [`//span[contains(text(), "Bạn viết gì đi...")]`],

  elementsPost: [`div[aria-label="Đăng"][role="button"]`],

  elementsCreatePost: [`div[aria-label="Tạo bài viết"][role="dialog"]`],

  elementsTextBoxEditor: [`div[contenteditable="true"][role="textbox"]`],

  elementsCloseDialog: ['//div[@aria-label="Đóng hộp thoại của công cụ tạo"]'],

  elementsSpammed: [
    `//div[contains(text(), "Để bảo vệ cộng đồng khỏi spam, chúng tôi giới hạn tần suất bạn đăng bài, bình luận hoặc làm các việc khác trong khoảng thời gian nhất định. Bạn có thể thử lại sau")]`,
  ],

  listElementContainers: [`div[aria-label="Bản xem trước nhóm"]`],

  waitingGroups: [`//span[contains(text(),"Yêu cầu tham gia nhóm đang chờ")]`],

  allGroupsJoinTexts: [
    `//span[contains(text(),"Tất cả các nhóm bạn đã tham gia")]`,
  ],
};

const SELECTOR_RAW = {
  listItems: `div[role="listitem"]`,
  toolbarLabel: `div#toolbarLabel`,
  inputFiles: `input[accept][multiple][type="file"]`,
};

export {
  KEY_RETRY_CALL,
  KEY_IS_SHOW_DASHBOARD,
  KEY_ALL_GROUPS,
  KEY_GROUPS_NEED_POST,
  KEY_GROUPS_POSTED,
  KEY_POST,
  KEY_POST_LENGTH,
  KEY_RE_POST_ALL_GROUP,
  KEY_IS_TEST,
  KEY_LAST_TIME_POST,
  KEY_IS_IN_PROGRESS,
  KEY_STOP_TASK,
  KEY_MAX_GROUP_PER_TIME,
  KEY_SCHEDULER,
  MAX_GROUP_PER_TIME_INITIAL,
  URL_DASHBOARD,
  URL_TAB_TASK,
  isDashboardTab,
  isPostTab,
  MAX_Z_INDEX,
  KEY_DATA_POST_SAVED,
  KEY_INDEXS_GROUP_CHECKED,
  KEY_INDEX_GROUP_POST,
  KEY_IS_SCROLL_DETECT_LIST_GROUP,
  prefix,
  KEY_IS_SHOW_ADVANCE_SETTING,
  KEY_IS_SHOW_PANEL_GROUP,
  KEY_TIME_DELAY,
  initialTimeDelay,
  KEY_IS_FIX_STEAL_FOCUS,
  KEY_QUEUE,
  KEY_IS_DEVELOPER_MODE,
  KEY_COUNT_RESET_GROUPS,
  KEY_IS_DARK_THEME,
  KEY_LANGUAGE,
  KEY_TITLE_STRICTLY_MATCH_GROUP,
  STATUS_TASK,
  SCHEDULER_TYPE,
  URL_LIST_GROUPS,
  SELECTOR,
  SELECTOR_VI,
  SELECTOR_RAW,
  KEY_TAB,
  KEY_CAN_POST_THIS_TAB,
  KEY_IS_SHUFFLE_SCHEDULER_TIME,
  KEY_IS_SPAMMED,
  KEY_NEXT_TIME_POST_WHEN_SPAMMED,
  KEY_IS_FIX_STEAL_ALL_FOCUS,
  KEY_COUNT_POST,
  APP_NAME,
  KEY_HISTORY_LOGS,
  KEY_IS_SHUFFLE_GROUPS_NEED_POST,
};
