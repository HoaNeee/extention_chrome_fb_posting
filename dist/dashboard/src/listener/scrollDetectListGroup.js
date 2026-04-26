import { KEY_IS_SCROLL_DETECT_LIST_GROUP } from "../contants";

export default function scrollDetectListGroupListener(callback) {
  GM_addValueChangeListener(
    KEY_IS_SCROLL_DETECT_LIST_GROUP,
    function (name, old_value, new_value, remote) {
      callback(new_value);
    },
  );
}
