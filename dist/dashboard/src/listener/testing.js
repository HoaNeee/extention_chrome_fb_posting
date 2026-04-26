import { KEY_IS_TEST } from "../contants";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo";

export default function testingListener(callback) {
  GM_addValueChangeListener(KEY_IS_TEST, (_, __, newVal) => {
    callback(newVal);
    updateDataSavedInfo();
  });
}
