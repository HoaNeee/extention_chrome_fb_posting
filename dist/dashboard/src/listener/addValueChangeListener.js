import {
  KEY_ALL_GROUPS,
  KEY_GROUPS_NEED_POST,
  KEY_IS_DEVELOPER_MODE,
  KEY_IS_IN_PROGRESS,
  KEY_IS_TEST,
  KEY_POST,
  KEY_SCHEDULER,
} from "../../../contants/contants.js";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo.js";
import {
  disabledElement,
  enabledElement,
  getAllFieldsSetting,
} from "../helpers/elementDom.js";
import { clearAndCreateSchedulerAlarm } from "../services/scheduler-service.js";
import { DB_setValue } from "../utils/api-helper.js";

export default function addValueChangeListener(cb) {
  const keys = [
    KEY_IS_TEST,
    KEY_SCHEDULER,
    KEY_ALL_GROUPS,
    KEY_IS_IN_PROGRESS,
    KEY_POST,
    KEY_GROUPS_NEED_POST,
    KEY_IS_DEVELOPER_MODE,
  ];
  const { setIsTest } = getAllFieldsSetting();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      for (const key of keys) {
        if (changes[key]) {
          const newVal = changes[key]?.newValue;
          if (key === KEY_IS_IN_PROGRESS) {
            cb?.(newVal);
          }
          if (key === KEY_IS_DEVELOPER_MODE) {
            if (newVal) {
              enabledElement({ selector: "#tm_btn-test-auto" });
              enabledElement({ selector: "#tm_btn-click" });
              enabledElement({
                selector: "#tm_checkbox-is-test",
                isField: true,
                fieldSelector: ".tm_field-container",
              });
            } else {
              DB_setValue(KEY_IS_TEST, false);
              setIsTest(false);
              disabledElement({ selector: "#tm_btn-test-auto" });
              disabledElement({ selector: "#tm_btn-click" });
              disabledElement({
                selector: "#tm_checkbox-is-test",
                isField: true,
                fieldSelector: ".tm_field-container",
                isCheckbox: true,
              });
            }
          }
          if (key === KEY_SCHEDULER) {
            if (newVal.isScheduler) {
              clearAndCreateSchedulerAlarm();
            }
          }
          if (key === KEY_IS_TEST) {
            setIsTest(newVal);
          }
          updateDataSavedInfo();
          break;
        }
      }
    }
  });
}
