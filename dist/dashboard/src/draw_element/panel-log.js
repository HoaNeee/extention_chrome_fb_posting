import { APP_NAME, prefix } from "../../../contants/contants.js";
import { getTextWithLanguage, logError, sleep } from "../../../utils/utils.js";
import {
  addHistoryLog,
  clearHistoryLogs,
  getHistoryLogsInStorage,
} from "../helpers/storage.js";

function createPanelLog(anchorElem = document.body) {
  const div = document.createElement("div");
  div.className = "tm_inner-root-log";
  div.setAttribute("data-tab-value", "logs");

  div.innerHTML = `
    <div style="display: flex; gap: 16px; height: 100%;">
        <div style="height: 100%;">
            <h2 style="margin-bottom: 8px;">${getTextWithLanguage({ vi: "Nhật ký hành động", en: "Logs" })}</h2>
            <div id="${prefix}data-saved-info" style="margin-bottom: 8px;"></div>
        </div>
        <div style="border-left: 1px solid var(--tm-border-color); padding-left: 10px;  display: flex; flex-direction: column; flex: 1;">
            <h2 style="margin-bottom: 8px;">${getTextWithLanguage({ vi: "Lịch sử", en: "History" })}</h2>
            <div style="display: flex; justify-content: flex-end; margin-bottom: 8px">
              <button id="${prefix}btn-clear-history">${getTextWithLanguage({ vi: "Xóa lịch sử", en: "Clear History" })}</button>
            </div>
            <div class="history-logs custom-scrollbar"></div>
        </div>
    </div>
  `;

  const root = anchorElem.querySelector("#tm_root");

  if (root) {
    root.appendChild(div);
  }
}

/**
 *
 * @param {{msg: {vi: string, en: string}|string, time: number}} msgObject
 * @returns {HTMLElement}
 */
function drawHistoryLogItem(msgObject = {}) {
  const div = document.createElement("div");
  div.className = "history-logs-item";
  if (msgObject) {
    const { msg, time } = msgObject;
    const date = new Date(time);
    const text =
      typeof msg === "object"
        ? getTextWithLanguage({ vi: msg.vi || "", en: msg.en || "" })
        : msg;
    div.innerHTML = `<p>• [${APP_NAME}][${date.toLocaleDateString()}][${date.toLocaleTimeString()}]: <span>${text}</span></p>`;
  }
  return div;
}

/**
 * @param {{vi: string, en: string}|string} msg
 */
async function addLog(msg) {
  try {
    await addHistoryLog(msg);
  } catch (error) {
    logError("Error at addLog method: ", error);
  }
}

async function initHistoryLogs() {
  try {
    let histories = await getHistoryLogsInStorage();
    const historyLogs = document.querySelector(".history-logs");

    if (!histories.length) {
      await addLog({ vi: "Bắt đầu sử dụng", en: "Start using" });
      histories = await getHistoryLogsInStorage();
      return;
    }

    histories.forEach((msgObject) => {
      const div = drawHistoryLogItem(msgObject);
      historyLogs.appendChild(div);
    });

    const btnClearHistory = document.querySelector("#tm_btn-clear-history");
    if (btnClearHistory) {
      let timeOutClearHistory = null;
      let isConfirmClearHistory = false;
      btnClearHistory.addEventListener("click", async () => {
        try {
          if (isConfirmClearHistory) {
            clearTimeout(timeOutClearHistory);
            isConfirmClearHistory = false;
            await clearHistoryLogs();
            historyLogs.innerHTML = "";
            btnClearHistory.innerText = getTextWithLanguage({
              vi: "Xóa lịch sử",
              en: "Clear History",
            });
            btnClearHistory.style.backgroundColor = "";
            addLog({
              vi: "Xóa toàn bộ lịch sử",
              en: "Clear all history",
            });
            return;
          }

          btnClearHistory.innerText = getTextWithLanguage({
            vi: "Nhấn lại để xác nhận",
            en: "Click again to confirm",
          });
          btnClearHistory.style.backgroundColor = "var(--tm-text-danger)";
          isConfirmClearHistory = true;
          timeOutClearHistory = setTimeout(() => {
            isConfirmClearHistory = false;
            btnClearHistory.innerText = getTextWithLanguage({
              vi: "Xóa lịch sử",
              en: "Clear History",
            });
            btnClearHistory.style.backgroundColor = "";
          }, 3000);
        } catch (error) {
          logError("Error at btnClearHistory click event: ", error);
        }
      });
    }
  } catch (error) {
    logError("Error at initHistoryLogs method: ", error);
  }
}

function scrollHistoryLogs() {
  const historyLogs = document.querySelector(".history-logs");
  if (historyLogs) {
    historyLogs.scrollTo({
      top: historyLogs.scrollHeight,
    });
  }
}

export {
  createPanelLog,
  addLog,
  initHistoryLogs,
  drawHistoryLogItem,
  scrollHistoryLogs,
};
