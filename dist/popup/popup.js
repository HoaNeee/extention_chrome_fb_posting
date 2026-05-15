import { getLanguageInStorage } from "../dashboard/src/helpers/storage.js";
import { getTextWithLanguage, initLanguage } from "../utils/utils.js";

function drawPopupBody() {
  return `
    <p class="popup-desc">${getTextWithLanguage({ vi: "Giúp bạn một số tác vụ trên facebook", en: "Help you some tasks on facebook." })}</p>
    <div class="popup-section">
      <h2>${getTextWithLanguage({ vi: "Cách sử dụng", en: "How to use" })}</h2>
      <ol>
        <li>${getTextWithLanguage({ vi: "Đi đến trang ", en: "Navigate to" })}<strong class="navigate-to-dashboard link-hover">${getTextWithLanguage({ vi: "Điều khiển", en: "Dashboard page" })}</strong></li>
        <li>${getTextWithLanguage({ vi: "Nhập nội dung cần đăng và đính kèm tệp (nếu cần) trong", en: "Enter post content and attach media files (if needed) in" })} <strong>${getTextWithLanguage({ vi: "Cấu hình nhóm cần đăng", en: "group need to post config" })}</strong></li>
        <li>${getTextWithLanguage({ vi: "Cấu hình danh sách nhóm bạn muốn đăng trong ", en: "Configure list groups that you want to post in " })} <strong>${getTextWithLanguage({ vi: "Cấu hình nhóm cần đăng", en: "group need to post config" })}</strong></li>
        <li>${getTextWithLanguage({ vi: "Cấu hình cài đặt nếu cần trong ", en: "Configure settings if needed in " })} <strong>${getTextWithLanguage({ vi: "Cài đặt", en: "Settings" })}</strong></li>
        <li>${getTextWithLanguage({ vi: "Nhấn nút Tự Động để chạy", en: "Click Auto New button to run" })}</li>
      </ol>
    </div>
    <div class="popup-section">
      <h2>${getTextWithLanguage({ vi: "Mẹo", en: "Tips" })}</h2>
      <ul>
        <li>${getTextWithLanguage({ vi: "Tự động chọn nhóm ngẫu nhiên trong danh sách nhóm cần đăng", en: "Automatically select groups almost randomly from the list of groups to post" })}</li>
        <li>${getTextWithLanguage({ vi: "Tự động chọn bài viết ngẫu nhiên trong danh sách bài viết cần đăng", en: "Automatically select posts almost randomly from the list of posts to post" })}</li>
        <li>${getTextWithLanguage({ vi: "Hỗ trợ ngôn ngữ tiếng Việt và tiếng Anh", en: "Supports both English and Vietnamese" })}</li>
        <li>${getTextWithLanguage({ vi: "Bạn có thể thay đổi giao diện trong Bảng Điều khiển", en: "You can change theme in Dashboard" })}</li>
      </ul>

    </div>
    <div class="popup-section">
      <button class="navigate-to-dashboard btn">${getTextWithLanguage({ vi: "Mở Bảng Điều Khiển", en: "Open Dashboard" })}</button>
    </div>
  `;
}

async function main() {
  try {
    await initLanguage();
    const popupBody = document.querySelector(".popup-body");
    if (popupBody) {
      popupBody.innerHTML = drawPopupBody();
    }

    const navigateToDashboard = document.querySelectorAll(
      ".navigate-to-dashboard",
    );
    navigateToDashboard.forEach((item) => {
      item.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
        window.close();
      });
    });
  } catch (error) {
    console.log("error at main popup: ", error);
  }
}

main();
