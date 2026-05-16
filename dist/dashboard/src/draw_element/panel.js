import {
  KEY_ALL_GROUPS,
  KEY_GROUPS_NEED_POST,
  KEY_GROUPS_POSTED,
  KEY_IS_IN_PROGRESS,
  KEY_IS_TEST,
  KEY_MAX_GROUP_PER_TIME,
  KEY_POST,
  KEY_RETRY_CALL,
  KEY_STOP_TASK,
  URL_DASHBOARD,
  KEY_POST_LENGTH,
  KEY_INDEXS_GROUP_CHECKED,
  KEY_IS_SCROLL_DETECT_LIST_GROUP,
  prefix,
  initialTimeDelay,
  KEY_IS_FIX_STEAL_FOCUS,
  KEY_IS_DEVELOPER_MODE,
  KEY_COUNT_RESET_GROUPS,
  KEY_IS_DARK_THEME,
  KEY_LANGUAGE,
  KEY_IS_SHUFFLE_SCHEDULER_TIME,
  KEY_IS_SPAMMED,
  KEY_IS_FIX_STEAL_ALL_FOCUS,
  KEY_IS_SHUFFLE_GROUPS_NEED_POST,
} from "../../../contants/contants.js";
import { getGroupsMatch, resetPostedGroupAndSave } from "../helpers/group.js";
import {
  createSchedulerDailyHours,
  createSchedulerHours,
  createSchedulerMinutes,
  getListFrameHours,
  getSchedulerWithType,
} from "../helpers/scheduler.js";
import {
  setProgress,
  getTimeDelayInStorage,
  setTimeDelayInStorage,
  setStrictlyMatchTitleGroupInStorage,
  getProgress,
  getRandomIndexGroupChecked,
  getStrictlyMatchTitleGroupInStorage,
} from "../helpers/storage.js";
import {
  getAllDataGroupsInStorage,
  getListGroupsService,
  setGroupsNeedPost,
} from "../services/groupService.js";
import {
  DB_getValue,
  DB_setValue,
  DB_deleteValue,
} from "../utils/api-helper.js";
import {
  now,
  sleep,
  findMatch,
  logError,
  randomID,
  getTextWithLanguage,
  logActions,
} from "../../../utils/utils.js";
import { updateDataSavedInfo } from "./dataSavedInfo.js";
import { createDialog, dialogConfirm, dialogViewScheduler } from "./dialog.js";
import { createDivListGroups } from "./listGroup.js";
import { showNotify } from "./notify.js";
import { drawPanelGroup } from "./panelGroup.js";
import {
  setDataSavedInStorage,
  getDataSavedInStorage,
  getDataGroupsSavedNeedPost,
} from "../services/dataSavedService.js";
import {
  automation,
  automationContinue,
  automationTest,
} from "../services/automation-service.js";
import {
  clearAndCreateSchedulerAlarm,
  clearSchedulerAuto,
  getSchedulerService,
  setSchedulerService,
} from "../services/scheduler-service.js";
import { addLog } from "./panel-log.js";

function drawInnerRoot() {
  const innerRoot = document.createElement("div");
  innerRoot.classList.add("tm_inner-root");
  innerRoot.setAttribute("data-tab-value", "dashboard");

  const dashboardHTML = `
      <div style="overflow: auto; padding-right: 18px;" class="${prefix}div-dashboard">
        <h2 style="margin-bottom: 8px;">${getTextWithLanguage({ vi: "Bảng điều khiển", en: "Dashboard" })}</h2>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; flex-direction: column;">
            <div style="display: flex; gap: 4px;">
            <button button id="${prefix}btn-auto" style="width: 100%;">${getTextWithLanguage({ vi: "Tự động", en: "Auto New" })}</button>
              <button button id="${prefix}btn-stop-task" style="width: 100%;">${getTextWithLanguage({ vi: "Dừng", en: "Stop All" })}</button>
            </div>
            <div style="display: flex; gap: 4px;">
            <button button id="${prefix}btn-get-data-groups" style="width: 100%;">${getTextWithLanguage({ vi: "Lấy danh sách nhóm", en: "Get List Groups" })}</button>
              <button button id="${prefix}btn-continue-post" style="width: 100%;">${getTextWithLanguage({ vi: "Tiếp tục", en: "Continue" })}</button>
            </div>
            <div style="display: flex; gap: 4px;">
              <button button id="${prefix}btn-set-all-groups-to-pending" style="width: 100%;">${getTextWithLanguage({ vi: "Đặt tất cả nhóm thành đang chờ", en: "Set All Groups To Pending" })}</button>
              <button button id="${prefix}btn-reset-groups-need-post" style="width: 100%;">${getTextWithLanguage({ vi: "Đặt lại nhóm cần đăng", en: "Reset Groups Need Post" })}</button>
            </div>
            <div style="display: flex; gap: 4px;">
              <button button id="${prefix}btn-reset-groups" style="width: 100%;">${getTextWithLanguage({ vi: "Đặt lại tất cả nhóm", en: "Reset All Groups" })}</button>
              <button button id="${prefix}btn-reset-is-spammed" style="width: 100%;">${getTextWithLanguage({ vi: "Đặt lại trạng thái bị spam", en: "Reset is spammed" })}</button>
            </div>
            <button button id="${prefix}btn-update-groups-need-post" style="width: 100%;">${getTextWithLanguage({ vi: "Cập nhật danh sách nhóm cần đăng", en: "Update groups need post" })}</button>
            <button button id="${prefix}btn-reset" style="width: 100%;">${getTextWithLanguage({ vi: "Đặt lại tất cả", en: "Reset All" })}</button>
            <button button id="${prefix}btn-test-auto" style="width: 100%;">${getTextWithLanguage({ vi: "Kiểm thử (dev)", en: "Test Auto" })}</button>
            <button button id="${prefix}btn-click" style="width: 100%;">${getTextWithLanguage({ vi: "Click", en: "Click" })}</button>
        </div>
      </div>
    `;

  const advancedSettingHTML = `
    <div class="${prefix}advanced-setting" style="padding-left: 10px; overflow: auto; padding-right: 18px; border-left: 1px solid var(--tm-border-color);">
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
          <h2 style="">${getTextWithLanguage({ vi: "Cài đặt nâng cao", en: "Advanced Setting" })}</h2>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div class="${prefix}field-container">
            <label for="${prefix}input-max-group-per-time">${getTextWithLanguage({ vi: "Số lượng nhóm tối đa mỗi lần", en: "Max group per time" })}</label>
            <div style="display: flex; gap: 4px;">
              <input min="1" type="number" id="${prefix}input-max-group-per-time" class="${prefix}input-outline" style="display: inline-block; flex: 1;">
              <button id="${prefix}btn-save-max-group-per-time" class="not-style">${getTextWithLanguage({ vi: "Lưu", en: "Save" })}</button>
            </div>
          </div>
          <div style="">
            <div class="${prefix}field-container">
              <label for="${prefix}input-strictly-match-title-group">${getTextWithLanguage({ vi: `Các từ khóa lọc nghiêm ngặt trong tên (cách nhau bằng dấu phẩy ',')`, en: "Strictly match title keywords group (separate by comma ',')" })}</label>
              <div style="display: flex; gap: 4px;">
                <textarea placeholder="Ex: Cho thuê trọ, nhà trọ, ..." id="${prefix}input-strictly-match-title-group" class="${prefix}input-outline" style="flex: 1; height: 70px; padding: 8px 4px"></textarea>
              </div>
            </div>

            <div class="${prefix}field-description" style="margin-left: 4px"><span style="color: var(--tm-text-secondary); font-size: 10px;">${getTextWithLanguage({ vi: "(Tránh trường hợp lọc nhầm nhóm không mong muốn)", en: "(Avoid mistakenly filtering unwanted groups)" })}</span></div>
            <div style="text-align: end; margin-top: 4px;">
              <button id="${prefix}btn-save-strictly-match-title-group" class="not-style">${getTextWithLanguage({ vi: "Lưu từ khóa", en: "Save keywords" })}</button>
            </div>
          </div>
          <div class="${prefix}field-container field-checkbox">
            <input type="checkbox" id="${prefix}checkbox-is-processing">
            <label for="${prefix}checkbox-is-processing" style="user-select: none;">${getTextWithLanguage({ vi: "Đang chạy", en: "Auto is processing" })}</label>
          </div>
          <div class="${prefix}field-container field-checkbox">
            <input type="checkbox" id="${prefix}checkbox-is-test">
            <label for="${prefix}checkbox-is-test" style="user-select: none;">${getTextWithLanguage({ vi: "Đang kiểm thử", en: "Auto is testing" })}</label>
          </div>
          <div class="${prefix}field-container field-checkbox">
            <input type="checkbox" id="${prefix}checkbox-is-spammed">
            <label for="${prefix}checkbox-is-spammed" style="user-select: none;">${getTextWithLanguage({ vi: "Bị spam", en: "Is spammed" })}</label>
          </div>
          <div class="${prefix}field-container field-checkbox">
            <input type="checkbox" id="${prefix}checkbox-is-fix-steal-focus">
            <label for="${prefix}checkbox-is-fix-steal-focus" style="user-select: none;">${getTextWithLanguage({ vi: "Tránh nhảy tab", en: "Fix steal focus" })}</label>
          </div>
          <div class="${prefix}field-container field-checkbox">
            <input type="checkbox" id="${prefix}checkbox-is-shuffle-groups-need-post">
            <label for="${prefix}checkbox-is-shuffle-groups-need-post" style="user-select: none;">${getTextWithLanguage({ vi: "Tự động trộn nhóm cần đăng", en: "Shuffle groups need post" })}</label>
          </div>
          <div class="${prefix}field-container field-checkbox">
            <input type="checkbox" id="${prefix}checkbox-is-fix-steal-all-focus">
            <label for="${prefix}checkbox-is-fix-steal-all-focus" style="user-select: none;">${getTextWithLanguage({ vi: "Tránh nhảy tab hoàn toàn (Thử nghiệm)", en: "Fix steal all focus (Beta)" })}</label>
          </div>
          <div class="${prefix}field-container field-checkbox">
            <input type="checkbox" id="${prefix}checkbox-is-shuffle-scheduler-time">
            <label for="${prefix}checkbox-is-shuffle-scheduler-time" style="user-select: none;">${getTextWithLanguage({ vi: "Tự động trộn lịch (Thử nghiệm)", en: "Shuffle scheduler time (Beta)" })}</label>
          </div>
          <div class="${prefix}field-container field-checkbox">
            <input type="checkbox" id="${prefix}checkbox-is-scheduler">
            <label for="${prefix}checkbox-is-scheduler" style="user-select: none;">${getTextWithLanguage({ vi: "Lên lịch", en: "Scheduler" })}</label>
          </div>
          <div id="${prefix}div-scheduler-options" style="padding-left: 16px; max-width: 250px; min-width: 200px;">
            <div style="margin-bottom: 4px;">
              <button class="not-style" style="padding: 6px; font-size: 12px" id="${prefix}btn-view-scheduler">${getTextWithLanguage({ vi: "Xem lịch", en: "View scheduler" })}</button>
            </div>
            <div id="${prefix}div-scheduler-setting" style="margin-top: 4px;">
              <label for="${prefix}select-scheduler-type" style="margin-bottom: 4px; display: inline-block;">${getTextWithLanguage({ vi: "Chọn loại lịch", en: "Select scheduler type" })}:</label>
              <select id="${prefix}select-scheduler-type" style="padding: 4px 0; width: 100%;">
                <option value="daily-hours">${getTextWithLanguage({ vi: "Hàng giờ (1:00,2:00,...)", en: "Daily hours (1:00,2:00,...)" })}</option>
                <option value="custom-every-minutes">${getTextWithLanguage({ vi: "Mỗi phút", en: "Every minutes" })} (1,5,10,...)</option>
                <option value="custom-every-hours">${getTextWithLanguage({ vi: "Mỗi giờ", en: "Every hours" })} (1,2,3,...)</option>
                <option value="custom-frame-hours">${getTextWithLanguage({ vi: "Khung giờ", en: "Frame hours" })} (1:01,2:12,4:20,...)</option>
              </select>
              <div id="${prefix}div-scheduler-daily-hours" style="display: none; padding: 4px; margin-top: 4px;">
                <div style="text-align: right;">
                  <button class="not-style" style="padding: 4px; font-size: 12px; " id="${prefix}btn-reset-daily-hours">${getTextWithLanguage({ vi: "Đặt lại hàng ngày", en: "Reset daily hours" })}</button>
                </div>
              </div>
              <div id="${prefix}div-scheduler-custom-minutes" style="display: none; padding: 4px; margin-top: 4px;">
                <div class="${prefix}field-container">
                  <label for="${prefix}input-custom-minutes" style="font-size: 11px">${getTextWithLanguage({ vi: "Nhập tùy chỉnh mỗi phút", en: "Enter custom every minutes" })}: </label>
                  <input min="1" style="font-size: 12px;" type="number" id="${prefix}input-custom-minutes" class="${prefix}input-outline" placeholder="Ex: 1,5,10,...">
                  <div style="text-align: right;">
                    <button class="not-style" style="padding: 4px; font-size: 12px; " id="${prefix}btn-save-custom-minutes">${getTextWithLanguage({ vi: "Lưu", en: "Save" })}</button>
                  </div>
                </div>
              </div>
              <div id="${prefix}div-scheduler-custom-hours" style="display: none; padding: 4px; margin-top: 4px;">
                <div class="${prefix}field-container">
                  <label for="${prefix}input-custom-hours" style="font-size: 11px">${getTextWithLanguage({ vi: "Nhập tùy chỉnh mỗi giờ", en: "Enter custom every hours" })}: </label>
                  <input min="1" style="font-size: 12px;" type="number" id="${prefix}input-custom-hours" class="${prefix}input-outline" placeholder="Ex: 1,2,3,...">
                  <div style="text-align: right;">
                    <button class="not-style" style="padding: 4px; font-size: 12px; " id="${prefix}btn-save-custom-hours">${getTextWithLanguage({ vi: "Lưu", en: "Save" })}</button>
                  </div>
                </div>
              </div>
              <div id="${prefix}div-scheduler-custom-frame-hours" style="display: none; padding: 4px; margin-top: 4px;">
                <div class="${prefix}field-container">
                  <label for="${prefix}input-custom-frame-hours" style="font-size: 11px">${getTextWithLanguage({ vi: "Nhập khung giờ (phân tách bằng dấu phẩy ',')", en: "Enter hours (Sperator with comma ',')" })} <p>${getTextWithLanguage({ vi: "Ví dụ", en: "Example" })}: 1:00, 2:00, 3:00,...</p></label>
                  <input style="width: 100%; font-size: 12px;" type="text" id="${prefix}input-custom-frame-hours" class="${prefix}input-outline" placeholder="Ex: 1:00,2:00,...">
                </div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <button class="not-style" style="padding: 4px; font-size: 10px; " id="${prefix}btn-add-frame-hours">${getTextWithLanguage({ vi: "Thêm khung giờ", en: "Add frame hours" })}</button>
                  <button class="not-style" style="padding: 4px; font-size: 10px; " id="${prefix}btn-remove-frame-hours">${getTextWithLanguage({ vi: "Xóa khung giờ", en: "Remove frame hours" })}</button>
                  <button class="not-style" style="padding: 4px; font-size: 10px; " id="${prefix}btn-reset-frame-hours">${getTextWithLanguage({ vi: "Đặt lại khung giờ", en: "Reset frame hours" })}</button>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-top: 8px;">
            <h3>${getTextWithLanguage({ vi: "Cài đặt thời gian chờ (sẽ cộng trừ một vài đơn vị)", en: "Delay Settings (will add or subtract a few units)" })}</h3>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div class="${prefix}field-container">
                <label for="${prefix}input-delay-click-to-post" style="font-size: 12px">${getTextWithLanguage({ vi: "Chọn thời gian chờ nhấn nút hiển thị hộp thoại đăng", en: "Enter delay click to post" })} (seconds): </label>
                <input min="1" style="font-size: 12px;" type="number" id="${prefix}input-delay-click-to-post" class="${prefix}input-outline" placeholder="Ex: 1,5,10,...">
              </div>
              <div class="${prefix}field-container">
                <label for="${prefix}input-delay-fill-content" style="font-size: 12px">${getTextWithLanguage({ vi: "Chọn thời gian chờ điền nội dung", en: "Enter delay fill content" })} (seconds): </label>
                <input min="1" style="font-size: 12px;" type="number" id="${prefix}input-delay-fill-content" class="${prefix}input-outline" placeholder="Ex: 1,5,10,...">
              </div>
              <div class="${prefix}field-container">
                <label for="${prefix}input-delay-fill-file" style="font-size: 12px">${getTextWithLanguage({ vi: "Chọn thời gian chờ điền tệp/file", en: "Enter delay fill file" })} (seconds): </label>
                <input min="1" style="font-size: 12px;" type="number" id="${prefix}input-delay-fill-file" class="${prefix}input-outline" placeholder="Ex: 1,5,10,...">
              </div>
              <div class="${prefix}field-container">
                <label for="${prefix}input-delay-post" style="font-size: 12px">${getTextWithLanguage({ vi: "Chọn thời gian chờ nhấn nút đăng bài", en: "Enter delay post" })} (seconds): </label>
                <input min="1" style="font-size: 12px;" type="number" id="${prefix}input-delay-post" class="${prefix}input-outline" placeholder="Ex: 1,5,10,...">
              </div>
              <div class="${prefix}field-container">
                <label for="${prefix}input-delay-open-new-tab" style="font-size: 12px">${getTextWithLanguage({ vi: "Chọn thời gian chờ mở tab mới", en: "Enter delay open new tab" })} (seconds): </label>
                <input min="1" style="font-size: 12px;" type="number" id="${prefix}input-delay-open-new-tab" class="${prefix}input-outline" placeholder="Ex: 1,5,10,...">
              </div>
            </div>
          </div>
        </div>
    </div>
  `;

  const groupHTML = `
    <div id="${prefix}div-panel-group" style="padding: 0 24px;">
				<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
          <h2 style="">${getTextWithLanguage({ vi: "Nhóm", en: "Groups" })}</h2>
        </div>
        <div>
          <button id="${prefix}btn-add-group">${getTextWithLanguage({ vi: "Thêm nhóm", en: "Add group" })}</button>
          <button id="${prefix}btn-clear-group">${getTextWithLanguage({ vi: "Xóa nhóm", en: "Clear group" })}</button>
        </div>
        <div style="margin: 8px 0;">
          <button id="${prefix}btn-export-groups">${getTextWithLanguage({ vi: "Xuất danh sách", en: "Export" })}</button>
          <button id="${prefix}btn-import-groups">${getTextWithLanguage({ vi: "Nhập danh sách", en: "Import" })}</button>
          <input type="file" id="${prefix}input-import-groups" style="display: none;" accept=".json">
        </div>
				<div style="padding: 8px;" id="${prefix}list-groups-container"></div>
			</div>
  `;

  innerRoot.innerHTML = `
        ${dashboardHTML}
        ${advancedSettingHTML}
        ${groupHTML}
     `;

  return innerRoot;
}

//just call one time when init app
async function createPanel(doc = document.body) {
  try {
    const root = doc.querySelector("#tm_root");

    const innerRoot = drawInnerRoot();

    root.appendChild(innerRoot);

    doc.appendChild(root);

    //work at list groups
    //dialog edit group
    const {
      setIsShow: setIsShowDialogEditGroup,
      changeContent: changeContentDialogEditGroup,
    } = createDialog({
      html: ``,
      title: getTextWithLanguage({ vi: "Chỉnh sửa nhóm", en: "Edit group" }),
    });

    const listGroupsContainer = innerRoot.querySelector(
      `#${prefix}list-groups-container`,
    );

    const dataListDataSaved = await getDataSavedInStorage();

    async function drawListGroups(data) {
      const divs = await createDivListGroups(data);

      const innerDiv = document.createElement("div");
      innerDiv.style.display = "flex";
      innerDiv.style.flexDirection = "column";
      innerDiv.style.gap = "4px";

      if (!divs.length) {
        listGroupsContainer.innerHTML = `<div style="text-align: center; color: #666;">No groups</div>`;
        return;
      }

      async function onDeleteGroup(id) {
        try {
          const dataSaved = (await getDataSavedInStorage()) || [];
          const groupTitle =
            dataSaved.find((item) => item.id === id)?.name || "";
          const newDataSaved = dataSaved.filter((item) => item.id !== id);

          const indexsChecked =
            (await DB_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];
          const set = new Set(indexsChecked);
          set.delete(id);
          DB_setValue(KEY_INDEXS_GROUP_CHECKED, Array.from(set));

          setDataSavedInStorage(newDataSaved);
          await drawListGroups(newDataSaved);
          setIsShowDialogEditGroup(false);
          showNotify({
            message: "Delete group successfully",
            type: "success",
          });

          addLog({
            vi: `Bạn vừa xóa dữ liệu nhóm: ${groupTitle}`,
            en: `You just deleted data of group: ${groupTitle}`,
          });
        } catch (error) {
          addLog({
            vi: `Không thể xóa dữ liệu nhóm`,
            en: `Cannot delete data of group`,
          });
          showNotify({
            message: "Error occurred while deleting group",
            type: "error",
          });
          logError("Error at onDeleteGroup: ", error);
        }
      }

      for (const div of divs) {
        const id = div.getAttribute("data-group-id");
        const btnView = div.querySelector(`#${prefix}btn-view-group`);

        const group = findMatch({
          data: data,
          key: "id",
          value: id,
        });

        if (group) {
          btnView?.addEventListener("click", () => {
            const elementPanel = drawPanelGroup({
              initialData: {
                id: id || group.id,
                title: group.title,
                contents: group.contents,
                files: group.files,
                name: group?.name || "",
                priority: group?.priority || "",
              },
              type: "edit",
              onDelete: () => {
                onDeleteGroup(id);
              },
              onSave: async () => {
                const dataSaved = (await getDataSavedInStorage()) || [];
                await drawListGroups(dataSaved);
                setIsShowDialogEditGroup(false);
                showNotify({
                  message: "Save group successfully",
                  type: "success",
                });
              },
            });
            changeContentDialogEditGroup(elementPanel);
            setIsShowDialogEditGroup(true);
          });
        }
        innerDiv.appendChild(div);
      }
      listGroupsContainer.innerHTML = "";
      listGroupsContainer.appendChild(innerDiv);
    }

    if (listGroupsContainer) {
      await drawListGroups(dataListDataSaved || []);
    }
    //end work at list groups

    //dialog add group
    const panelAddGroupHTML = drawPanelGroup({
      onSave: async () => {
        const dataSaved = (await getDataSavedInStorage()) || [];
        await drawListGroups(dataSaved);
        setIsShowAddDialogGroup(false);
        showNotify({
          message: "Add new group successfully",
          type: "success",
        });
      },
      initPriority: dataListDataSaved.length + 1,
    });

    const { setIsShow: setIsShowAddDialogGroup } = createDialog({
      html: panelAddGroupHTML,
      title: getTextWithLanguage({ vi: "Thêm nhóm", en: "Add group" }),
    });

    //dialog view scheduler
    const {
      setIsShow: setIsShowViewDialogScheduler,
      changeContent: changeViewSchedulerContent,
    } = createDialog({
      html: dialogViewScheduler([]),
    });

    //scheduler
    let scheduler = await getSchedulerService();

    function schedulerEvent() {
      function setShowSchedulerCustomMinutes(isShow) {
        const divCustomMinutes = root.querySelector(
          `#${prefix}div-scheduler-custom-minutes`,
        );
        if (divCustomMinutes) {
          divCustomMinutes.style.display = isShow ? "block" : "none";
        }
      }

      function setShowSchedulerCustomHours(isShow) {
        const divCustomHours = root.querySelector(
          `#${prefix}div-scheduler-custom-hours`,
        );
        if (divCustomHours) {
          divCustomHours.style.display = isShow ? "block" : "none";
        }
      }

      function setShowSchedulerCustomFrameHours(isShow) {
        const divCustomFrameHours = root.querySelector(
          `#${prefix}div-scheduler-custom-frame-hours`,
        );
        if (divCustomFrameHours) {
          divCustomFrameHours.style.display = isShow ? "block" : "none";
        }
      }

      function setShowSchedulerDailyHours(isShow) {
        const divDailyHours = root.querySelector(
          `#${prefix}div-scheduler-daily-hours`,
        );
        if (divDailyHours) {
          divDailyHours.style.display = isShow ? "block" : "none";
        }
      }

      return {
        setShowSchedulerCustomMinutes,
        setShowSchedulerCustomHours,
        setShowSchedulerCustomFrameHours,
        setShowSchedulerDailyHours,
      };
    }

    const {
      setShowSchedulerCustomFrameHours,
      setShowSchedulerCustomHours,
      setShowSchedulerCustomMinutes,
      setShowSchedulerDailyHours,
    } = schedulerEvent();

    async function onChangeSchedulerType(val) {
      const newSchduler = await getSchedulerService();
      newSchduler.type = val;

      changeViewSchedulerContent(
        dialogViewScheduler(await getSchedulerWithType(val)),
      );

      switch (val) {
        case "daily-hours":
          setShowSchedulerCustomHours(false);
          setShowSchedulerCustomMinutes(false);
          setShowSchedulerCustomFrameHours(false);
          setShowSchedulerDailyHours(true);
          break;
        case "custom-every-minutes":
          setShowSchedulerCustomHours(false);
          setShowSchedulerCustomMinutes(true);
          setShowSchedulerCustomFrameHours(false);
          setShowSchedulerDailyHours(false);
          break;
        case "custom-every-hours":
          setShowSchedulerCustomHours(true);
          setShowSchedulerCustomMinutes(false);
          setShowSchedulerCustomFrameHours(false);
          setShowSchedulerDailyHours(false);
          break;
        case "custom-frame-hours":
          setShowSchedulerCustomFrameHours(true);
          setShowSchedulerCustomHours(false);
          setShowSchedulerCustomMinutes(false);
          setShowSchedulerDailyHours(false);
          break;

        default:
          break;
      }
      scheduler = newSchduler;
      setSchedulerService(newSchduler);
    }

    //end scheduler

    //initial data for panel
    async function initialDataPanel() {
      await onChangeSchedulerType(scheduler.type);
      changeViewSchedulerContent(
        dialogViewScheduler(await getSchedulerWithType(scheduler.type)),
      );
      const selectSchedulerType = root.querySelector(
        `#${prefix}select-scheduler-type`,
      );
      if (selectSchedulerType) {
        selectSchedulerType.value = scheduler.type;
      }
      const inputCustomMinutes = root.querySelector(
        `#${prefix}input-custom-minutes`,
      );
      if (inputCustomMinutes) {
        inputCustomMinutes.value = scheduler.valueMinutes || "";
      }
      const inputCustomHours = root.querySelector(
        `#${prefix}input-custom-hours`,
      );
      if (inputCustomHours) {
        inputCustomHours.value = scheduler.valueHours || "";
      }
    }

    await initialDataPanel();
    //end initial data for panel

    //add event for buttons
    function addButtonsEvent() {
      //This is function add event for all buttons

      const dialogConfirmHTML = dialogConfirm({
        title: getTextWithLanguage({
          en: "Are you sure to reset all data?",
          vi: "Bạn có chắc chắn muốn xóa tất cả dữ liệu?",
        }),
        onConfirm: async () => {
          resetAllEvent();
          setIsShowConfirmDialogReset(false);
          showNotify({
            message: "Reset all data successfully",
            type: "success",
          });
          await sleep(500);
          addLog({
            vi: "Đặt lại tất cả dữ liệu",
            en: "Reset all data",
          });
          location.reload();
        },
        onCancel: () => {
          setIsShowConfirmDialogReset(false);
        },
      });

      const { setIsShow: setIsShowConfirmDialogReset } = createDialog({
        html: dialogConfirmHTML,
      });

      function resetAllEvent() {
        try {
          DB_deleteValue(KEY_POST_LENGTH);
          DB_deleteValue(KEY_STOP_TASK);
          DB_deleteValue(KEY_RETRY_CALL);
          DB_deleteValue(KEY_POST);
          DB_deleteValue(KEY_GROUPS_NEED_POST);
          DB_deleteValue(KEY_GROUPS_POSTED);
          DB_deleteValue(KEY_ALL_GROUPS);
          DB_deleteValue(KEY_IS_IN_PROGRESS);
          DB_deleteValue(KEY_IS_TEST);
          DB_setValue(KEY_IS_SCROLL_DETECT_LIST_GROUP, true);
          DB_setValue(KEY_COUNT_RESET_GROUPS, 0);
        } catch (error) {
          showNotify({
            message: error.message,
            type: "error",
          });
        }
      }

      function saveCustomHoursEvent() {
        try {
          const inputCustomHours = document.querySelector(
            `#tm_input-custom-hours`,
          );
          if (inputCustomHours) {
            const val = inputCustomHours.value;
            const newSchedulerHours = createSchedulerHours(val);
            scheduler.schedulerHours = newSchedulerHours;
            scheduler.valueHours = val;
            changeViewSchedulerContent(
              dialogViewScheduler(scheduler.schedulerHours),
            );
            setSchedulerService(scheduler);
            showNotify({
              message: "Save custom every hours successfully",
              type: "success",
            });
            if (scheduler.isScheduler) {
              clearAndCreateSchedulerAlarm();
            }
          }
        } catch (error) {
          showNotify({
            message: error.message,
            type: "error",
          });
        }
      }

      async function saveCustomMinutesEvent() {
        try {
          const inputCustomMinutes = document.querySelector(
            `#tm_input-custom-minutes`,
          );
          if (inputCustomMinutes) {
            let val = inputCustomMinutes.value;
            const isTest = (await DB_getValue(KEY_IS_TEST)) || false;
            const isDevMode =
              (await DB_getValue(KEY_IS_DEVELOPER_MODE)) || false;
            val = Number(val);

            if (val < 5) {
              if (isTest || isDevMode) val = Math.max(1, val);
              else val = 5;
            }

            const newSchedulerMinutes = await createSchedulerMinutes(val);
            scheduler.schedulerMinutes = newSchedulerMinutes;
            scheduler.valueMinutes = val;
            changeViewSchedulerContent(
              dialogViewScheduler(scheduler.schedulerMinutes),
            );
            setSchedulerService(scheduler);
            showNotify({
              message: "Save custom every minutes successfully",
              type: "success",
            });
            if (scheduler.isScheduler) {
              clearAndCreateSchedulerAlarm();
            }
          }
        } catch (error) {
          showNotify({
            message: error.message || error,
            type: "error",
          });
        }
      }

      function addOrRemoveFrameHoursEvent({ cb, isRemove = false }) {
        const inputCustomFrameHours = document.querySelector(
          `#tm_input-custom-frame-hours`,
        );
        if (inputCustomFrameHours) {
          try {
            const val = inputCustomFrameHours.value;
            // const { h, m } = convertFrameHours(val);
            const list = getListFrameHours(val);

            if (isRemove) {
              const newList = [];
              for (const time of scheduler.frameHours) {
                if (!list.find((t) => t.h === time.h && t.m === time.m)) {
                  newList.push(time);
                }
              }
              scheduler.frameHours = newList;
              showNotify({
                message: "Remove frame hours successfully",
                type: "success",
              });
              cb?.();
              return;
            }

            const set = new Set(
              scheduler.frameHours.map((time) => `${time.h}:${time.m}`),
            );

            for (const time of list) {
              const { h, m } = time;
              if (!set.has(`${h}:${m}`)) {
                set.add(`${h}:${m}`);
                scheduler.frameHours.push({ h, m });
              }
            }

            showNotify({
              message: "Add frame hours successfully",
              type: "success",
            });

            cb?.();
          } catch (error) {
            showNotify({ message: error.message, type: "error" });
          }
        }
      }

      async function exportGroupsEvent() {
        try {
          const dataSaved = (await getDataSavedInStorage()) || [];
          if (!dataSaved || !dataSaved.length) {
            showNotify({
              message: "No data to export",
              type: "error",
            });
            return;
          }
          const dataStr = JSON.stringify(dataSaved);

          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;

          const timeNow = now();
          const name = `data_groups_${timeNow}.json`;
          a.download = name;
          a.click();
          URL.revokeObjectURL(url);
          addLog({
            vi: `Bạn vừa xuất ${dataSaved.length} nhóm vào file json ${name}`,
            en: `You just exported ${dataSaved.length} groups to a JSON file ${name}`,
          });
        } catch (error) {
          logError("Error exportGroupsEvent: ", error);
          showNotify({
            message: "Error export groups",
            type: "error",
          });
        }
      }

      async function importGroupsEvent() {
        const inputImportGroups = document.querySelector(
          `#tm_input-import-groups`,
        );
        if (inputImportGroups) {
          inputImportGroups.click();
          inputImportGroups.onchange = function (event) {
            try {
              const file = event.target.files[0];
              const reader = new FileReader();
              reader.onload = async function (e) {
                try {
                  const content = e.target.result;
                  const data = JSON.parse(content);
                  if (data) {
                    const dataSaved = (await getDataSavedInStorage()) || [];
                    let prio = dataSaved.length + 1;
                    if (Array.isArray(data)) {
                      for (const item of data) {
                        item.id = randomID();
                        item.priority = prio;
                        ++prio;
                      }
                      const newDataSaved = [...dataSaved, ...data];
                      setDataSavedInStorage(newDataSaved);
                      showNotify({
                        message: "Import groups successfully",
                        type: "success",
                      });
                      await drawListGroups(newDataSaved);
                      addLog({
                        vi: `Bạn vừa thêm ${data.length} nhóm vào danh sách nhóm từ file`,
                        en: `You just added ${data.length} groups to the list of groups from importing a file`,
                      });
                    }
                    //import only one not array
                    else {
                      data.id = randomID();
                      data.priority = prio;
                      dataSaved.push(data);
                      setDataSavedInStorage(dataSaved);
                      showNotify({
                        message: "Import group successfully",
                        type: "success",
                      });
                      await drawListGroups(dataSaved);
                      addLog({
                        vi: `Bạn vừa thêm 1 nhóm vào danh sách nhóm từ file`,
                        en: `You just added 1 group to the list of groups from importing a file`,
                      });
                    }
                  }
                } catch (err) {
                  showNotify({
                    message: "Invalid file format",
                    type: "error",
                  });
                  logError("Error at importGroupsEvent: ", err);
                  return;
                }
              };
              reader.readAsText(file);
            } catch (error) {
              logError("Error at importGroupsEvent: ", error);
            }
          };
        }
      }

      const btnGetListGroups = document.querySelector(
        `#tm_btn-get-data-groups`,
      );
      if (btnGetListGroups) {
        btnGetListGroups.addEventListener("click", async () => {
          try {
            getListGroupsService();
          } catch (error) {
            logError("Error at btnGetListGroups click event: ", error);
          }
        });
      }

      const btnResetGroups = document.querySelector(`#tm_btn-reset-groups`);
      if (btnResetGroups) {
        let isConfirmingResetAllGroups = false;
        let timeOutIdResetAllGroups = null;
        btnResetGroups.addEventListener("click", async () => {
          if (isConfirmingResetAllGroups) {
            if (timeOutIdResetAllGroups) {
              clearTimeout(timeOutIdResetAllGroups);
              timeOutIdResetAllGroups = null;
            }
            DB_deleteValue(KEY_GROUPS_NEED_POST);
            DB_deleteValue(KEY_GROUPS_POSTED);
            DB_deleteValue(KEY_ALL_GROUPS);
            showNotify({
              message: "Reset all groups successfully",
              type: "success",
            });
            isConfirmingResetAllGroups = false;
            btnResetGroups.innerText = getTextWithLanguage({
              en: "Reset All Groups",
              vi: "Đặt lại tất cả nhóm",
            });
            btnResetGroups.style.background = "";
            DB_setValue(KEY_COUNT_RESET_GROUPS, 0);
            addLog({
              vi: "Đặt lại tất cả nhóm",
              en: "Reset all groups",
            });
          } else {
            isConfirmingResetAllGroups = true;
            btnResetGroups.innerText = getTextWithLanguage({
              en: "Click again to confirm",
              vi: "Xác nhận lại",
            });
            btnResetGroups.style.background = "var(--tm-text-danger)";
            timeOutIdResetAllGroups = setTimeout(() => {
              isConfirmingResetAllGroups = false;
              btnResetGroups.innerText = getTextWithLanguage({
                en: "Reset All Groups",
                vi: "Đặt lại tất cả nhóm",
              });
              btnResetGroups.style.background = "";
            }, 3000);
          }
        });
      }

      const btnResetGroupNeedPost = document.querySelector(
        `#tm_btn-reset-groups-need-post`,
      );
      if (btnResetGroupNeedPost) {
        let isConfirmingResetGroupsNeedPost = false;
        let timeOutIdResetGroupNeedPost = null;
        btnResetGroupNeedPost.addEventListener("click", async () => {
          if (isConfirmingResetGroupsNeedPost) {
            if (timeOutIdResetGroupNeedPost) {
              clearTimeout(timeOutIdResetGroupNeedPost);
              timeOutIdResetGroupNeedPost = null;
            }
            DB_deleteValue(KEY_GROUPS_NEED_POST);
            DB_deleteValue(KEY_GROUPS_POSTED);
            DB_setValue(KEY_POST_LENGTH, 0);
            showNotify({
              message: "Reset groups need post successfully",
              type: "success",
            });
            isConfirmingResetGroupsNeedPost = false;
            btnResetGroupNeedPost.innerText = getTextWithLanguage({
              en: "Reset Groups Need Post",
              vi: "Đặt lại nhóm cần đăng",
            });
            btnResetGroupNeedPost.style.background = "";
            DB_setValue(KEY_COUNT_RESET_GROUPS, 0);
            await updateDataSavedInfo();
            addLog({
              vi: "Đặt lại nhóm cần đăng",
              en: "Reset groups need post",
            });
          } else {
            isConfirmingResetGroupsNeedPost = true;
            btnResetGroupNeedPost.innerText = getTextWithLanguage({
              en: "Click again to confirm",
              vi: "Xác nhận lại",
            });
            btnResetGroupNeedPost.style.background = "var(--tm-text-danger)";
            timeOutIdResetGroupNeedPost = setTimeout(() => {
              isConfirmingResetGroupsNeedPost = false;
              btnResetGroupNeedPost.innerText = getTextWithLanguage({
                en: "Reset Groups Need Post",
                vi: "Đặt lại nhóm cần đăng",
              });
              btnResetGroupNeedPost.style.background = "";
            }, 3000);
          }
        });
      }

      const btnSetAllGroupsToPending = document.querySelector(
        `#tm_btn-set-all-groups-to-pending`,
      );
      if (btnSetAllGroupsToPending) {
        let isConfirmingSetAllGroupsToPending = false;
        let timeOutIdSetAllGroupsToPending = null;
        btnSetAllGroupsToPending.addEventListener("click", async () => {
          if (isConfirmingSetAllGroupsToPending) {
            if (timeOutIdSetAllGroupsToPending) {
              clearTimeout(timeOutIdSetAllGroupsToPending);
              timeOutIdSetAllGroupsToPending = null;
            }

            await resetPostedGroupAndSave();
            showNotify({
              message: "Set all groups to pending successfully",
              type: "success",
            });
            isConfirmingSetAllGroupsToPending = false;
            btnSetAllGroupsToPending.innerText = getTextWithLanguage({
              en: "Set All Groups To Pending",
              vi: "Đặt lại tất cả nhóm thành chờ",
            });
            btnSetAllGroupsToPending.style.background = "";
            DB_setValue(KEY_COUNT_RESET_GROUPS, 0);
            addLog({
              vi: "Đặt lại tất cả nhóm thành chờ",
              en: "Set all groups to pending",
            });
          } else {
            isConfirmingSetAllGroupsToPending = true;
            btnSetAllGroupsToPending.innerText = getTextWithLanguage({
              en: "Click again to confirm",
              vi: "Xác nhận lại",
            });
            btnSetAllGroupsToPending.style.background = "var(--tm-text-danger)";
            timeOutIdSetAllGroupsToPending = setTimeout(() => {
              isConfirmingSetAllGroupsToPending = false;
              btnSetAllGroupsToPending.innerText = getTextWithLanguage({
                en: "Set All Groups To Pending",
                vi: "Đặt lại tất cả nhóm thành chờ",
              });
              btnSetAllGroupsToPending.style.background = "";
            }, 3000);
          }
        });
      }

      const btnContinue = document.querySelector(`#tm_btn-continue-post`);
      if (btnContinue) {
        btnContinue.addEventListener("click", async () => {
          try {
            await automationContinue();
          } catch (error) {
            logError("Error at btnContinue click event: ", error);
          }
        });
      }

      const btnTest = document.querySelector(`#tm_btn-test-auto`);
      if (btnTest) {
        btnTest.addEventListener("click", async () => {
          //auto test
          try {
            await automationTest();
          } catch (error) {
            setProgress(false);
            logError("Error at btnTest click event: ", error);
          }
        });
      }

      const btnStop = document.querySelector(`#tm_btn-stop-task`);
      if (btnStop) {
        btnStop.addEventListener("click", async () => {
          if (await getProgress()) {
            showNotify({
              message: "Auto was be stopped",
              type: "error",
            });
          }
          setProgress(false);
          DB_setValue(KEY_STOP_TASK, true);
        });
      }

      const btnReset = document.querySelector(`#tm_btn-reset`);
      if (btnReset) {
        btnReset.addEventListener("click", () => {
          setIsShowConfirmDialogReset(true);
        });
      }

      const btnAuto = document.querySelector(`#tm_btn-auto`);
      if (btnAuto) {
        btnAuto.addEventListener("click", async () => {
          //auto
          try {
            await automation();
            addLog({
              vi: "Bắt đầu đăng tự động",
              en: "Start auto post",
            });
          } catch (error) {
            setProgress(false);
            logError("Error at btnAuto click event: ", error);
          }
        });
      }

      const btnClick = document.querySelector(`#tm_btn-click`);
      if (btnClick) {
        btnClick.addEventListener("click", async () => {
          try {
            // chrome.tabs.query({}, function (tabs) {
            //   tabs.forEach((tab) => {
            //     chrome.tabs.reload(tab.id, {
            //       bypassCache: true,
            //     });
            //   });
            // });
            // setInterval(() => {
            //   addLog({
            //     en: "test log 1",
            //     vi: "test log 1 tieng viet",
            //   });
            // }, 1000);
            console.log(await getRandomIndexGroupChecked());
          } catch (error) {
            logError("Error at btnClick click event: ", error);
          }
        });
      }

      const btnUpdateGroupsNeedPost = document.querySelector(
        `#tm_btn-update-groups-need-post`,
      );
      if (btnUpdateGroupsNeedPost) {
        btnUpdateGroupsNeedPost.addEventListener("click", async () => {
          try {
            const allGroups = await getAllDataGroupsInStorage();

            const indexsChecked =
              (await DB_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];

            const dataSaveds = await getDataGroupsSavedNeedPost();

            const listGroups = allGroups;

            const titleStrictlyMatch =
              await getStrictlyMatchTitleGroupInStorage();
            let list = [];
            for (const data of dataSaveds) {
              const id = data.id;
              if (
                indexsChecked &&
                Array.isArray(indexsChecked) &&
                indexsChecked.includes(id)
              ) {
                const title = data.title;
                const name = data.name || "";
                const priority = data.priority || 1;
                const listGroupsMatch = getGroupsMatch({
                  title,
                  listGroups,
                  titleStrictlyMatch,
                });

                list.push({
                  id,
                  title,
                  name,
                  priority,
                  groups: listGroupsMatch,
                });
              }
            }

            // //sort by groups length asc
            list = list.sort((a, b) => {
              if (
                a.priority !== b.priority &&
                a.priority !== undefined &&
                b.priority !== undefined &&
                a.priority !== null &&
                b.priority !== null
              ) {
                return a.priority - b.priority;
              }
              return a.groups.length - b.groups.length;
            });

            showNotify({
              message: "Update groups need post successfully",
              type: "success",
            });

            addLog({
              vi: "Bạn vừa cập nhật danh sách nhóm cần đăng",
              en: "You just updated the list of groups need post",
            });

            logActions("update data", list);

            await setGroupsNeedPost(list);
          } catch (error) {
            logError("Error at btnUpdateGroupsNeedPost click event: ", error);
          }
        });
      }

      const btnResetIsSpammed = document.querySelector(
        `#tm_btn-reset-is-spammed`,
      );
      if (btnResetIsSpammed) {
        btnResetIsSpammed.addEventListener("click", async () => {
          try {
            DB_setValue(KEY_IS_SPAMMED, false);
            updateDataSavedInfo();
          } catch (error) {
            logError("Error at btnResetIsSpammed click event: ", error);
          }
        });
      }

      const btnGotoDashboard = document.querySelector(`#tm_btn-goto-dashboard`);
      if (btnGotoDashboard) {
        btnGotoDashboard.addEventListener("click", async () => {
          if (location.href !== URL_DASHBOARD) {
            location.href = URL_DASHBOARD;
          }
        });
      }

      const btnSaveMaxGroupPerTime = document.querySelector(
        `#tm_btn-save-max-group-per-time`,
      );
      if (btnSaveMaxGroupPerTime) {
        btnSaveMaxGroupPerTime.addEventListener("click", () => {
          try {
            const maxGroupPerTime = document.querySelector(
              `#tm_input-max-group-per-time`,
            );
            if (maxGroupPerTime) {
              let val = maxGroupPerTime.value;
              if (!Number.isNaN(Number(val))) {
                val = Math.max(1, Number(val));
                DB_setValue(KEY_MAX_GROUP_PER_TIME, Number(val));
              } else {
                DB_setValue(KEY_MAX_GROUP_PER_TIME, 1);
              }
            }
            showNotify({
              message: "Save max group per time successfully",
              type: "success",
            });
            updateDataSavedInfo();
          } catch (error) {
            logError("Error save max group per time: ", error);
            showNotify({
              message: "Save max group per time failed",
              type: "error",
            });
          }
        });
      }

      const btnAddGroup = document.querySelector(`#tm_btn-add-group`);
      if (btnAddGroup) {
        btnAddGroup.addEventListener("click", () => {
          setIsShowAddDialogGroup(true);
        });
      }

      //clear groups
      const btnClearGroup = document.querySelector(`#tm_btn-clear-group`);
      if (btnClearGroup) {
        let isConfirmingClearGroups = false;
        let timeOutIdClearGroups = null;
        btnClearGroup.addEventListener("click", () => {
          if (isConfirmingClearGroups) {
            if (timeOutIdClearGroups) {
              clearTimeout(timeOutIdClearGroups);
              timeOutIdClearGroups = null;
            }
            setDataSavedInStorage([]);
            DB_deleteValue(KEY_INDEXS_GROUP_CHECKED);
            drawListGroups([]);
            showNotify({
              message: "Clear groups successfully",
              type: "success",
            });
            isConfirmingClearGroups = false;
            btnClearGroup.innerText = getTextWithLanguage({
              en: "Clear groups",
              vi: "Xóa nhóm",
            });
            btnClearGroup.style.background = "";
            addLog({
              vi: "Bạn vừa xóa hết danh sách nhóm cần đăng",
              en: "You just cleared all groups need post",
            });
          } else {
            isConfirmingClearGroups = true;
            btnClearGroup.innerText = getTextWithLanguage({
              en: "Click again to confirm",
              vi: "Xác nhận lại",
            });
            btnClearGroup.style.background = "var(--tm-text-danger)";
            timeOutIdClearGroups = setTimeout(() => {
              isConfirmingClearGroups = false;
              btnClearGroup.innerText = getTextWithLanguage({
                en: "Clear groups",
                vi: "Xóa nhóm",
              });
              btnClearGroup.style.background = "";
            }, 3000);
          }
        });
      }

      const btnExportGroups = document.querySelector(`#tm_btn-export-groups`);
      if (btnExportGroups) {
        btnExportGroups.addEventListener("click", exportGroupsEvent);
      }

      const btnImportGroups = document.querySelector(`#tm_btn-import-groups`);
      if (btnImportGroups) {
        btnImportGroups.addEventListener("click", importGroupsEvent);
      }

      //scheduler
      const btnViewScheduler = document.querySelector(`#tm_btn-view-scheduler`);
      if (btnViewScheduler) {
        btnViewScheduler.addEventListener("click", () => {
          setIsShowViewDialogScheduler(true);
        });
      }

      const btnSaveCustomMinutes = document.querySelector(
        `#tm_btn-save-custom-minutes`,
      );
      if (btnSaveCustomMinutes) {
        btnSaveCustomMinutes.addEventListener("click", saveCustomMinutesEvent);
      }

      const btnSaveCustomHours = document.querySelector(
        `#tm_btn-save-custom-hours`,
      );
      if (btnSaveCustomHours) {
        btnSaveCustomHours.addEventListener("click", saveCustomHoursEvent);
      }

      const btnAddFrameHours = document.querySelector(
        `#tm_btn-add-frame-hours`,
      );
      if (btnAddFrameHours) {
        btnAddFrameHours.addEventListener("click", () => {
          addOrRemoveFrameHoursEvent({
            cb: () => {
              changeViewSchedulerContent(
                dialogViewScheduler(scheduler.frameHours),
              );
              setSchedulerService(scheduler);
            },
          });
        });
      }

      const btnRemoveFrameHours = document.querySelector(
        `#tm_btn-remove-frame-hours`,
      );
      if (btnRemoveFrameHours) {
        btnRemoveFrameHours.addEventListener("click", () => {
          addOrRemoveFrameHoursEvent({
            isRemove: true,
            cb: () => {
              changeViewSchedulerContent(
                dialogViewScheduler(scheduler.frameHours),
              );
              setSchedulerService(scheduler);
            },
          });
        });
      }

      const btnResetFrameHours = document.querySelector(
        `#tm_btn-reset-frame-hours`,
      );

      if (btnResetFrameHours) {
        btnResetFrameHours.addEventListener("click", () => {
          scheduler.frameHours = [];
          changeViewSchedulerContent(dialogViewScheduler(scheduler.frameHours));
          showNotify({
            message: "Reset frame hours successfully",
            type: "success",
          });
          setSchedulerService(scheduler);
        });
      }

      const btnResetDailyHours = document.querySelector(
        `#tm_btn-reset-daily-hours`,
      );
      if (btnResetDailyHours) {
        btnResetDailyHours.addEventListener("click", () => {
          scheduler.dailyHours = createSchedulerDailyHours();
          changeViewSchedulerContent(dialogViewScheduler(scheduler.dailyHours));
          showNotify({
            message: "Reset daily hours successfully",
            type: "success",
          });
          setSchedulerService(scheduler);
        });
      }
      //end scheduler

      const btnChangeTheme = document.body.querySelector(
        `#${prefix}btn-change-theme`,
      );
      if (btnChangeTheme) {
        btnChangeTheme.addEventListener("click", async () => {
          const isDarkTheme = (await DB_getValue(KEY_IS_DARK_THEME)) || false;
          const newIsDarkTheme = !isDarkTheme;
          DB_setValue(KEY_IS_DARK_THEME, newIsDarkTheme);
          if (newIsDarkTheme) {
            document.body.classList.add("dark");
            document.body.classList.remove("light");
          } else {
            document.body.classList.remove("dark");
            document.body.classList.add("light");
          }

          const svgs = document.querySelectorAll(".tm_svg");
          svgs.forEach((svg) => {
            svg.setAttribute("fill", newIsDarkTheme ? "white" : "black");
          });
        });
      }

      const btnSaveStrictlyMatchTitleGroup = root.querySelector(
        `#${prefix}btn-save-strictly-match-title-group`,
      );
      if (btnSaveStrictlyMatchTitleGroup) {
        btnSaveStrictlyMatchTitleGroup.addEventListener("click", () => {
          try {
            const inputStrictlyMatchTitleGroup = root.querySelector(
              `#${prefix}input-strictly-match-title-group`,
            );
            const strictlyMatchTitleGroup = inputStrictlyMatchTitleGroup.value
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item !== "");
            setStrictlyMatchTitleGroupInStorage(strictlyMatchTitleGroup);
            showNotify({
              message: "Save keywords successfully",
              type: "success",
            });
          } catch (error) {
            logError("Error setStrictlyMatchTitleGroupInStorage: ", error);
          }
        });
      }
    }

    addButtonsEvent();
    //end add event for buttons

    //add event for fields
    async function addFieldsEvent() {
      try {
        const inputPerTime = root.querySelector(`#tm_input-max-group-per-time`);
        if (inputPerTime) {
          //ctrl + shift + D/d to toggle developer mode
          inputPerTime.addEventListener("keydown", async (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
              e.preventDefault();
              const devMode =
                (await DB_getValue(KEY_IS_DEVELOPER_MODE)) || false;
              DB_setValue(KEY_IS_DEVELOPER_MODE, !devMode);
              updateDataSavedInfo();
            }
          });
        }

        const inputStrictlyMatchGroup = root.querySelector(
          `#${prefix}input-strictly-match-title-group`,
        );
        if (inputStrictlyMatchGroup) {
          //ctrl + s/S to save keywords
          inputStrictlyMatchGroup.addEventListener("keydown", async (e) => {
            if (e.ctrlKey && (e.key === "S" || e.key === "s")) {
              e.preventDefault();
              try {
                const strictlyMatchTitleGroup = inputStrictlyMatchGroup.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter((item) => item !== "");
                setStrictlyMatchTitleGroupInStorage(strictlyMatchTitleGroup);
                showNotify({
                  message: "Save keywords successfully",
                  type: "success",
                });
              } catch (error) {
                logError("Error setStrictlyMatchTitleGroupInStorage: ", error);
              }
            }
          });
        }

        const checkboxIsProcessing = root.querySelector(
          `#tm_checkbox-is-processing`,
        );
        if (checkboxIsProcessing) {
          checkboxIsProcessing.addEventListener("change", async (e) => {
            try {
              const val = e.target.checked;
              DB_setValue(KEY_IS_IN_PROGRESS, val);
              if (!val) {
                const scheduler = await getSchedulerService();
                const isSpammed = (await DB_getValue(KEY_IS_SPAMMED)) || false;
                if (scheduler.isScheduler && !isSpammed) {
                  clearAndCreateSchedulerAlarm();
                }
              }
            } catch (error) {
              logError("Error checkboxIsProcessing change: ", error);
            }
          });
        }

        const checkboxIsTest = root.querySelector(`#tm_checkbox-is-test`);
        if (checkboxIsTest) {
          checkboxIsTest.addEventListener("change", (e) => {
            const val = e.target.checked;
            DB_setValue(KEY_IS_TEST, val);
          });
        }

        const checkboxIsFixStealFocus = root.querySelector(
          "#tm_checkbox-is-fix-steal-focus",
        );
        if (checkboxIsFixStealFocus) {
          checkboxIsFixStealFocus.addEventListener("change", (e) => {
            const val = e.target.checked;
            DB_setValue(KEY_IS_FIX_STEAL_FOCUS, val);
            updateDataSavedInfo();
          });
        }

        const checkboxIsFixStealAllFocus = root.querySelector(
          "#tm_checkbox-is-fix-steal-all-focus",
        );
        if (checkboxIsFixStealAllFocus) {
          checkboxIsFixStealAllFocus.addEventListener("change", (e) => {
            const val = e.target.checked;
            DB_setValue(KEY_IS_FIX_STEAL_ALL_FOCUS, val);
            updateDataSavedInfo();
          });
        }

        const checboxIsShuffleSchedulerTime = root.querySelector(
          `#${prefix}checkbox-is-shuffle-scheduler-time`,
        );
        if (checboxIsShuffleSchedulerTime) {
          checboxIsShuffleSchedulerTime.addEventListener("change", (e) => {
            const val = e.target.checked;
            DB_setValue(KEY_IS_SHUFFLE_SCHEDULER_TIME, val);
            updateDataSavedInfo();
          });
        }

        const checboxIsShuffleGroupsNeedPost = root.querySelector(
          `#${prefix}checkbox-is-shuffle-groups-need-post`,
        );
        if (checboxIsShuffleGroupsNeedPost) {
          checboxIsShuffleGroupsNeedPost.addEventListener("change", (e) => {
            const val = e.target.checked;
            DB_setValue(KEY_IS_SHUFFLE_GROUPS_NEED_POST, val);
            updateDataSavedInfo();
          });
        }

        const checkboxIsSpammed = root.querySelector(
          `#${prefix}checkbox-is-spammed`,
        );
        if (checkboxIsSpammed) {
          checkboxIsSpammed.addEventListener("change", (e) => {
            const val = e.target.checked;
            DB_setValue(KEY_IS_SPAMMED, val);
            updateDataSavedInfo();
          });
        }

        const checkboxIsScheduler = root.querySelector(
          `#tm_checkbox-is-scheduler`,
        );
        if (checkboxIsScheduler) {
          checkboxIsScheduler.addEventListener("change", async (e) => {
            try {
              const val = e.target.checked;
              scheduler.isScheduler = val;
              setSchedulerService({ ...scheduler, time: now() });
              if (!val) {
                clearSchedulerAuto();
                addLog({
                  vi: "Tắt lên lịch đăng tự động",
                  en: "Turn off scheduler",
                });
              } else {
                addLog({
                  vi: `Tạo bộ lập lịch tự động thành công`,
                  en: `Create scheduler auto success`,
                });
                clearAndCreateSchedulerAlarm();
              }
            } catch (error) {
              logError("Error at checkboxIsScheduler: ", error);
            }
          });
        }

        const selectSchedulerType = root.querySelector(
          `#${prefix}select-scheduler-type`,
        );
        if (selectSchedulerType) {
          selectSchedulerType.addEventListener("change", async (e) => {
            const val = e.target.value;
            await onChangeSchedulerType(val);
          });
        }

        //Delay time for each step when posting
        const timeDelay = await getTimeDelayInStorage();

        const inputClickToPost = root.querySelector(
          `#tm_input-delay-click-to-post`,
        );
        const inputFillContent = root.querySelector(
          `#tm_input-delay-fill-content`,
        );
        const inputFillFile = root.querySelector(`#tm_input-delay-fill-file`);
        const inputOpenNewTab = root.querySelector(
          `#tm_input-delay-open-new-tab`,
        );
        const inputDelayPost = root.querySelector(`#tm_input-delay-post`);

        if (inputClickToPost) {
          inputClickToPost.addEventListener("change", (e) => {
            const val = Number.isNaN(Number(e.target.value))
              ? 1
              : Number(e.target.value || 1);
            timeDelay.clickToPost = val || initialTimeDelay.clickToPost;
            setTimeDelayInStorage(timeDelay);
          });
        }

        if (inputFillContent) {
          inputFillContent.addEventListener("change", (e) => {
            const val = Number.isNaN(Number(e.target.value))
              ? 1
              : Number(e.target.value || 1);
            timeDelay.fillContent = val || initialTimeDelay.fillContent;
            setTimeDelayInStorage(timeDelay);
          });
        }

        if (inputFillFile) {
          inputFillFile.addEventListener("change", (e) => {
            const val = Number.isNaN(Number(e.target.value))
              ? 1
              : Number(e.target.value || 1);
            timeDelay.fillFile = val || initialTimeDelay.fillFile;
            setTimeDelayInStorage(timeDelay);
          });
        }

        if (inputOpenNewTab) {
          inputOpenNewTab.addEventListener("change", (e) => {
            const val = Number.isNaN(Number(e.target.value))
              ? 1
              : Number(e.target.value || 1);
            timeDelay.openNewTab = val || initialTimeDelay.openNewTab;
            setTimeDelayInStorage(timeDelay);
          });
        }

        if (inputDelayPost) {
          inputDelayPost.addEventListener("change", (e) => {
            const val = Number.isNaN(Number(e.target.value))
              ? 1
              : Number(e.target.value || 1);
            timeDelay.post = val || initialTimeDelay.post;
            setTimeDelayInStorage(timeDelay);
          });
        }

        const selectLanguage = document.querySelector(`#tm_select-language`);
        if (selectLanguage) {
          selectLanguage.addEventListener("change", (e) => {
            const lang = e.target.value;
            DB_setValue(KEY_LANGUAGE, lang);
            location.reload();
          });
        }
      } catch (error) {
        logError("Error at addFieldsEvent: ", error);
        throw new Error("Error at addFieldsEvent: " + error);
      }
    }

    await addFieldsEvent();
    //end add event for fields
  } catch (error) {
    logError("Error at createPanel: ", error);
  }
}

export { createPanel };
