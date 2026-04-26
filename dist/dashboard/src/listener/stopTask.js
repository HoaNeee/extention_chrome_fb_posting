import { KEY_STOP_TASK } from "../contants";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo";

export default function stopTaskListener(callback) {
  GM_addValueChangeListener(KEY_STOP_TASK, async (_, __, newVal) => {
    if (newVal) {
      callback();
    }
    updateDataSavedInfo();
  });
}
