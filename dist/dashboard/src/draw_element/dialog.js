import { MAX_Z_INDEX, SCHEDULER_TYPE } from "../../../contants/contants.js";
import {
  getTextWithLanguage,
  logError,
  randomID,
} from "../../../utils/utils.js";
import {
  getSchedulerService,
  setSchedulerService,
} from "../services/scheduler-service.js";

let dialogContainerElement = null;
let anchorElemDialog = null;

function dialogContainer({ anchorElem = document.body }) {
  anchorElemDialog = anchorElem;
  dialogContainerElement = document.createElement("div");
  dialogContainerElement.style.position = "absolute";
  dialogContainerElement.style.zIndex = MAX_Z_INDEX;
  dialogContainerElement.style.background = "var(--tm-bg-primary)";
  dialogContainerElement.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  dialogContainerElement.style.top = "50%";
  dialogContainerElement.style.left = "50%";
  dialogContainerElement.style.transform = "translate(-50%, -50%)";

  dialogContainerElement.style.display = "none";
  dialogContainerElement.style.pointerEvents = "none";

  dialogContainerElement.classList.add("tm_dialog-container");

  anchorElem.appendChild(dialogContainerElement);

  return dialogContainerElement;
}

function createDialog({ html = "", onClose, title = "" }) {
  try {
    if (!anchorElemDialog) {
      anchorElemDialog = document.querySelector("#tm_root") || document.body;
    }

    const id = randomID();

    const innerDiv = document.createElement("div");
    innerDiv.style.padding = "24px 16px 12px 16px";
    innerDiv.style.position = "relative";
    innerDiv.style.minHeight = "50px";
    innerDiv.style.minWidth = "200px";

    innerDiv.style.display = "none";
    innerDiv.style.pointerEvents = "none";

    innerDiv.setAttribute("open", false);

    innerDiv.setAttribute("id", "tm_dialog_inner-" + id);

    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.zIndex = MAX_Z_INDEX - 1;
    overlay.style.display = "none";
    overlay.style.pointerEvents = "none";
    overlay.setAttribute("id", "tm_dialog_overlay-" + id);

    anchorElemDialog.appendChild(overlay);

    const closeElementDialog = document.createElement("div");
    closeElementDialog.style.position = "absolute";
    closeElementDialog.style.top = "2px";
    closeElementDialog.style.right = "4px";
    closeElementDialog.style.cursor = "pointer";
    closeElementDialog.innerText = "✖";
    closeElementDialog.style.zIndex = MAX_Z_INDEX + 1;

    const h3Title = document.createElement("h3");
    h3Title.style.position = "absolute";
    h3Title.style.top = "10px";
    h3Title.style.left = "30px";
    h3Title.style.zIndex = MAX_Z_INDEX + 1;
    h3Title.textContent = title;

    function close() {
      onClose?.();
      setIsShow(false);
    }

    function changeContent(newHtml) {
      innerDiv.innerHTML = "";
      if (newHtml instanceof HTMLElement) {
        innerDiv.appendChild(newHtml);
      } else if (typeof newHtml === "string") {
        innerDiv.innerHTML = newHtml;
      }
    }

    changeContent(html);

    function setIsShow(isShow) {
      if (isShow) {
        overlay.addEventListener("click", close);

        dialogContainerElement.appendChild(innerDiv);
        anchorElemDialog.appendChild(dialogContainerElement);
        dialogContainerElement.appendChild(closeElementDialog);
        if (title) {
          dialogContainerElement.appendChild(h3Title);
        }
      } else {
        overlay.removeEventListener("click", close);

        anchorElemDialog.removeChild(dialogContainerElement);
        dialogContainerElement.removeChild(innerDiv);
        dialogContainerElement.removeChild(closeElementDialog);
        if (title) {
          dialogContainerElement.removeChild(h3Title);
        }
      }
      innerDiv.style.display = isShow ? "block" : "none";
      innerDiv.style.pointerEvents = isShow ? "auto" : "none";

      overlay.style.display = isShow ? "block" : "none";
      overlay.style.pointerEvents = isShow ? "auto" : "none";

      dialogContainerElement.style.display = isShow ? "block" : "none";
      dialogContainerElement.style.pointerEvents = isShow ? "auto" : "none";
    }

    closeElementDialog.addEventListener("click", () => {
      setIsShow(false);
    });

    return {
      setIsShow,
      container: innerDiv,
      changeContent,
    };
  } catch (error) {
    throw new Error("Error createDialog: " + error);
  }
}

/**
 *
 * @param {Array<{h: number, m: number}>} schedulers
 * @returns {HTMLElement}
 */
function dialogViewScheduler(schedulers) {
  if (!schedulers || !Array.isArray(schedulers)) {
    schedulers = [];
  }

  const div = document.createElement("div");
  div.style.textAlign = "center";

  const h3 = document.createElement("h3");
  h3.style.marginBottom = "8px";
  h3.textContent = getTextWithLanguage({
    en: "Schedulers",
    vi: "Lịch trình đăng",
  });

  const listContainer = document.createElement("div");
  listContainer.style.display = "flex";
  listContainer.style.flexDirection = "column";
  listContainer.style.gap = "8px";
  listContainer.style.maxHeight = "250px";
  listContainer.style.overflowY = "auto";
  listContainer.classList.add("scrollbar-custom");

  (schedulers || []).forEach((time) => {
    const timeDiv = document.createElement("div");
    timeDiv.style.display = "flex";
    timeDiv.style.alignItems = "center";
    timeDiv.style.gap = "8px";
    timeDiv.style.justifyContent = "center";

    timeDiv.textContent = `${time.h}:${time.m.toString().padStart(2, "0")}`;
    const btnDel = document.createElement("span");
    btnDel.textContent = "✖";
    btnDel.style.cursor = "pointer";
    btnDel.style.userSelect = "none";

    btnDel.addEventListener("click", async () => {
      try {
        const scheduler = await getSchedulerService();
        switch (scheduler.type) {
          case SCHEDULER_TYPE.DAILY_HOURS:
            const dailyHours = scheduler.dailyHours.filter((o) => {
              return !(o.h === time.h && o.m === time.m);
            });
            scheduler.dailyHours = dailyHours;
            break;
          case SCHEDULER_TYPE.EVERY_MINUTES:
            const minutes = scheduler.schedulerMinutes.filter((o) => {
              return !(o.h === time.h && o.m === time.m);
            });
            scheduler.schedulerMinutes = minutes;
            break;
          case SCHEDULER_TYPE.EVERY_HOURS:
            const hours = scheduler.schedulerHours.filter((o) => {
              return !(o.h === time.h && o.m === time.m);
            });
            scheduler.schedulerHours = hours;
            break;
          case SCHEDULER_TYPE.FRAME_HOURS:
            const frameHours = scheduler.frameHours.filter((o) => {
              return !(o.h === time.h && o.m === time.m);
            });
            scheduler.frameHours = frameHours;
            break;
          default:
            break;
        }
        setSchedulerService(scheduler);
        timeDiv.remove();
      } catch (error) {
        logError("Error delete scheduler: " + error);
      }
    });

    timeDiv.appendChild(btnDel);
    listContainer.appendChild(timeDiv);
  });

  div.appendChild(h3);
  div.appendChild(listContainer);

  return div;
}

function dialogConfirm({
  title = getTextWithLanguage({
    en: "Are you sure?",
    vi: "Bạn có chắc chắn?",
  }),
  onConfirm,
  onCancel,
}) {
  const div = document.createElement("div");
  const h3 = document.createElement("h3");
  const btnCancel = document.createElement("button");
  const btnConfirm = document.createElement("button");

  btnCancel.textContent = getTextWithLanguage({
    en: "Cancel",
    vi: "Hủy",
  });
  btnConfirm.textContent = getTextWithLanguage({
    en: "Confirm",
    vi: "Xác nhận",
  });

  h3.textContent = title;

  const innerDiv = document.createElement("div");
  innerDiv.style.display = "flex";
  innerDiv.style.justifyContent = "flex-end";
  innerDiv.style.gap = "8px";
  innerDiv.style.marginTop = "12px";

  innerDiv.appendChild(btnCancel);
  innerDiv.appendChild(btnConfirm);

  div.appendChild(h3);
  div.appendChild(innerDiv);

  btnCancel.addEventListener("click", () => {
    onCancel?.();
  });

  btnConfirm.addEventListener("click", () => {
    onConfirm?.();
  });

  return div;
}

export { createDialog, dialogViewScheduler, dialogContainer, dialogConfirm };
