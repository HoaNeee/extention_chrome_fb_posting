import {
  isDashboardTab,
  KEY_IS_RELOAD_DASHBOARD,
  KEY_SCHEDULER,
} from "../contants";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo";
import { disabledElement, enabledElement } from "../helpers/elementDom";
import {
  clearIntervalScheduler,
  setIntervalScheduler,
} from "../helpers/scheduler";

export default function schedulerChangeListener() {
  /*
  type of Object is {
    dailyHours: Array<{h: number, m: number}>,
    frameHours: Array<{h: number, m: number}>,
    schedulerMinutes: Array<{h: number, m: number}>,
    schedulerHours: Array<{h: number, m: number}>,
    type: string, // "daily-hours" | "custom-frame-hours" | "custom-scheduler-hours" | "custom-scheduler-minutes"
    isScheduler: boolean,
    valueMinutes: number,
    valueHours: number,
    time: now,
  }
  */

  GM_addValueChangeListener(KEY_SCHEDULER, (_, __, newVal, remote) => {
    if (remote) {
      const checkbox = document.querySelector("#tm_checkbox-is-scheduler");
      if (checkbox) {
        checkbox.checked = newVal.isScheduler || false;
      }
    }

    //clear every where
    if (!newVal.isScheduler) {
      clearIntervalScheduler();
      GM_setValue(KEY_IS_RELOAD_DASHBOARD, false);
      disabledElement({
        selector: "#tm_checkbox-is-reload-dashboard",
        isField: true,
        fieldSelector: "#tm_root .tm_field-container",
        isCheckbox: true,
      });
    } else {
      enabledElement({
        selector: "#tm_checkbox-is-reload-dashboard",
        isField: true,
        fieldSelector: "#tm_root .tm_field-container",
      });
    }

    if (isDashboardTab) {
      if (newVal.isScheduler) {
        setIntervalScheduler();
      }
    }

    updateDataSavedInfo();
  });
}
