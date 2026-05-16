import {
  KEY_ALL_GROUPS,
  KEY_GROUPS_NEED_POST,
  KEY_HISTORY_LOGS,
  KEY_IS_DEVELOPER_MODE,
  KEY_IS_IN_PROGRESS,
  KEY_IS_SPAMMED,
  KEY_IS_TEST,
  KEY_POST,
  KEY_SCHEDULER,
} from "../../../contants/contants.js";
import { logError } from "../../../utils/utils.js";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo.js";
import { drawHistoryLogItem } from "../draw_element/panel-log.js";
import {
  getAllFieldsSetting,
  hideElement,
  hideField,
  showElement,
  showField,
} from "../helpers/elementDom.js";
import {
  clearAndCreateSchedulerAlarm,
  getSchedulerService,
} from "../services/scheduler-service.js";
import { DB_setValue } from "../utils/api-helper.js";

let timeOutClearAndCreateSchedulerAlarm = null;

export default function addValueChangeListener(cb) {
  const keys = [
    KEY_IS_TEST,
    KEY_SCHEDULER,
    KEY_ALL_GROUPS,
    KEY_IS_IN_PROGRESS,
    KEY_POST,
    KEY_GROUPS_NEED_POST,
    KEY_IS_DEVELOPER_MODE,
    KEY_IS_SPAMMED,
    KEY_HISTORY_LOGS,
  ];
  const { setIsTest } = getAllFieldsSetting();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      for (const key of keys) {
        try {
          if (changes[key]) {
            const newVal = changes[key]?.newValue;
            if (key === KEY_IS_IN_PROGRESS) {
              cb?.(newVal);
            }
            if (key === KEY_IS_DEVELOPER_MODE) {
              if (newVal) {
                showElement("#tm_btn-test-auto");
                showElement("#tm_btn-click");
                showField({
                  selector: "#tm_checkbox-is-test",
                  fieldSelector: ".tm_field-container",
                });
                showField({
                  selector: "#tm_checkbox-is-spammed",
                  fieldSelector: ".tm_field-container",
                });
              } else {
                DB_setValue(KEY_IS_TEST, false);
                setIsTest(false);
                hideElement("#tm_btn-test-auto");
                hideElement("#tm_btn-click");
                hideField({
                  selector: "#tm_checkbox-is-test",
                  fieldSelector: ".tm_field-container",
                });
                hideField({
                  selector: "#tm_checkbox-is-spammed",
                  fieldSelector: ".tm_field-container",
                });
              }
            }
            if (key === KEY_IS_TEST) {
              setIsTest(newVal);
            }
            if (key === KEY_IS_SPAMMED) {
              if (timeOutClearAndCreateSchedulerAlarm) {
                clearTimeout(timeOutClearAndCreateSchedulerAlarm);
              }
              timeOutClearAndCreateSchedulerAlarm = setTimeout(() => {
                handleIsSpammed();
              }, 10000);
            }
            if (key === KEY_HISTORY_LOGS) {
              handleHisoryLog(newVal);
            }

            updateDataSavedInfo();
            break;
          }
        } catch (error) {
          logError("listener - addValueChangeListener error: ", error);
        }
      }
    }
  });
}

async function handleIsSpammed() {
  try {
    const scheduler = await getSchedulerService();
    if (scheduler.isScheduler) {
      clearAndCreateSchedulerAlarm();
    }
  } catch (error) {
    logError("Error at handle spammed at addValueChange", error);
  }
}

async function handleHisoryLog(histories) {
  try {
    if (histories && Array.isArray(histories) && histories.length) {
      const historyLogsElem = document.querySelector(".history-logs");

      const lastHistories = histories[histories.length - 1];

      if (lastHistories) {
        const div = drawHistoryLogItem(lastHistories);
        historyLogsElem.appendChild(div);
        historyLogsElem.scrollTo({
          top: historyLogsElem.scrollHeight,
        });
      }
    }
  } catch (error) {
    logError("Error at addLog method: ", error);
  }
}
