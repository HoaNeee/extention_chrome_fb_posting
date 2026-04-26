import { KEY_IS_TEST } from "../contants";
import {
  disabledElement,
  enabledElement,
  hideElement,
  showElement,
} from "../helpers/elementDom";

export function devModeListener(name, oldValue, newValue, remote) {
  if (newValue) {
    enabledElement({ selector: "#tm_btn-test-auto" });
    enabledElement({
      selector: "#tm_checkbox-is-test",
      isField: true,
      fieldSelector: "#tm_root .tm_field-container",
    });
    enabledElement({ selector: "#tm_btn-click" });
    showElement(`#tm_is-testing-status`);
    showElement(`#tm_is-developer-mode-status`);
  } else {
    GM_setValue(KEY_IS_TEST, false);
    disabledElement({ selector: "#tm_btn-test-auto" });
    disabledElement({
      selector: "#tm_checkbox-is-test",
      isField: true,
      fieldSelector: "#tm_root .tm_field-container",
    });
    disabledElement({ selector: "#tm_btn-click" });
    hideElement(`#tm_is-testing-status`);
    hideElement(`#tm_is-developer-mode-status`);
  }
}
