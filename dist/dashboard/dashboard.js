import { KEY_CURRENT_WINDOW_ID } from "../contants/constant-extention.js";
import { initLanguage, logError } from "../utils/utils.js";
import { dialogContainer } from "./src/draw_element/dialog.js";
import { createPanel } from "./src/draw_element/panel.js";
import {
  disabledElement,
  enabledElement,
  getAllFieldsSetting,
} from "./src/helpers/elementDom.js";
import { initialData } from "./src/helpers/initial.js";
import addValueChangeListener from "./src/listener/addValueChangeListener.js";
import { DB_setValue } from "./src/utils/api-helper.js";

async function main() {
  try {
    await initLanguage();

    const currentWindow = await chrome.windows.getCurrent();

    DB_setValue(KEY_CURRENT_WINDOW_ID, currentWindow.id);

    const mainElement = document.querySelector("main");

    dialogContainer({ anchorElem: document.body });

    const root = document.querySelector(`#tm_root`);
    if (root) {
      root.style.display = "none";
      root.style.pointerEvents = "none";
    }
    createPanel(mainElement);
    await initialData(mainElement);

    const { setIsProcessing } = getAllFieldsSetting();

    addValueChangeListener(async (newVal) => {
      try {
        setIsProcessing(newVal);
        if (newVal) {
          disabledElement({ selector: "#tm_btn-auto" });
          disabledElement({ selector: "#tm_btn-continue-post" });
          disabledElement({ selector: "#tm_btn-get-data-groups" });
        }
        if (!newVal) {
          enabledElement({ selector: "#tm_btn-auto" });
          enabledElement({ selector: "#tm_btn-continue-post" });
          enabledElement({ selector: "#tm_btn-get-data-groups" });
        }
      } catch (error) {
        logError("Error at dashboard addValueChangeListener: ", error);
      }
    });

    root.style.display = "block";
    root.style.pointerEvents = "auto";
  } catch (error) {
    logError("Error at dashboard main: ", error);
  }
}

main();
