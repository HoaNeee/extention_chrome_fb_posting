import {
	getSchedulerInStorage,
	getStrictlyMatchTitleGroupInStorage,
	getTimeDelayInStorage,
	setSchedulerInStorage,
} from "./storage.js";
import {
	disabledElement,
	enabledElement,
	getAllFieldsSetting,
} from "./elementDom.js";
import {
	KEY_GROUPS_POSTED,
	KEY_IS_IN_PROGRESS,
	KEY_IS_TEST,
	KEY_MAX_GROUP_PER_TIME,
	MAX_GROUP_PER_TIME_INITIAL,
	KEY_INDEXS_GROUP_CHECKED,
	KEY_GROUPS_NEED_POST,
	initialTimeDelay,
	isDashboardTab,
	KEY_IS_FIX_STEAL_FOCUS,
	KEY_IS_DARK_THEME,
	KEY_LANGUAGE,
	KEY_IS_DEVELOPER_MODE,
	SCHEDULER_TYPE,
} from "../../../contants/contants.js";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo.js";
import {
	getLanguage,
	logActions,
	logError,
	random,
} from "../../../utils/utils.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";
import { getDataSavedInStorage } from "../services/dataSavedService.js";

async function initialData({ anchorElement = document.body }) {
	try {
		async function initialSettings() {
			const {
				setMaxGroupPerTime,
				setIsTest,
				setIsProcessing,
				setScheduler: setSchedulerSetting,
				setIsFixStealFocus,
				setStrictlyMatchTitleGroup,
			} = getAllFieldsSetting();

			//get max group
			let maxGroup = await DB_getValue(KEY_MAX_GROUP_PER_TIME);
			if (!maxGroup) {
				maxGroup = MAX_GROUP_PER_TIME_INITIAL;
				DB_setValue(KEY_MAX_GROUP_PER_TIME, maxGroup);
			}

			setMaxGroupPerTime(maxGroup);

			const isTesting = (await DB_getValue(KEY_IS_TEST)) || false;
			setIsTest(isTesting);

			const isProcessing = (await DB_getValue(KEY_IS_IN_PROGRESS)) || false;
			setIsProcessing(isProcessing);

			const isFixStealFocus =
				(await DB_getValue(KEY_IS_FIX_STEAL_FOCUS)) || false;
			setIsFixStealFocus(isFixStealFocus);

			const scheduler = await getSchedulerInStorage();

			if (scheduler) {
				const isCheduler = scheduler.isScheduler || false;
				if (isCheduler) {
					setSchedulerSetting(isCheduler);
					enabledElement({
						selector: "#tm_checkbox-is-reload-dashboard",
						isField: true,
						fieldSelector: "#tm_root .tm_field-container",
					});
				} else {
					disabledElement({
						selector: "#tm_checkbox-is-reload-dashboard",
						isField: true,
						fieldSelector: "#tm_root .tm_field-container",
						isCheckbox: true,
					});
				}

				//shuffle time
				if (isDashboardTab) {
					const type = scheduler.type;
					if (
						type === SCHEDULER_TYPE.EVERY_MINUTES ||
						type === SCHEDULER_TYPE.EVERY_HOURS
					) {
						const times =
							type === SCHEDULER_TYPE.EVERY_MINUTES
								? [...scheduler.schedulerMinutes]
								: [...scheduler.schedulerHours];

						const newTimes = times.map((item) => {
							let m = item.m + random(-1, 2);
							if (m < 0) m = 0;
							if (m > 59) m = 59;

							return {
								...item,
								m,
							};
						});

						if (type === SCHEDULER_TYPE.EVERY_MINUTES) {
							scheduler.schedulerMinutes = newTimes;
						} else {
							scheduler.schedulerHours = newTimes;
						}
						setSchedulerInStorage(scheduler);
					}
				}
			}

			const strictlyMatchTitleGroup =
				await getStrictlyMatchTitleGroupInStorage();
			if (strictlyMatchTitleGroup) {
				setStrictlyMatchTitleGroup(strictlyMatchTitleGroup);
			}
		}

		await initialSettings();

		const listGroups = (await DB_getValue(KEY_GROUPS_NEED_POST)) || [];
		logActions("Initial list groups need post: ", listGroups);
		const dataSaved = (await getDataSavedInStorage()) || [];
		logActions("Initial data saved: ", dataSaved);

		//initial indexs checked
		const listGroupsContainer = anchorElement.querySelector(
			"#tm_list-groups-container",
		);
		if (listGroupsContainer) {
			const firstChild = listGroupsContainer.firstElementChild;
			if (firstChild) {
				const childs = firstChild.children || [];
				const indexsCheckeds =
					(await DB_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];
				logActions("Initial indexs checked: ", indexsCheckeds);
				for (const child of childs) {
					const id = child.getAttribute("data-group-id");
					if (id && indexsCheckeds.includes(id)) {
						const input = child.querySelector("input[type=checkbox]");
						if (input) {
							input.checked = true;
						}
					}
				}
			}
		}

		async function initialInputTimeDelay() {
			const timeDelay = await getTimeDelayInStorage();

			const inputClickToPost = anchorElement.querySelector(
				`#tm_input-delay-click-to-post`,
			);
			const inputFillContent = anchorElement.querySelector(
				`#tm_input-delay-fill-content`,
			);
			const inputFillFile = anchorElement.querySelector(
				`#tm_input-delay-fill-file`,
			);
			const inputOpenNewTab = anchorElement.querySelector(
				`#tm_input-delay-open-new-tab`,
			);
			const inputDelayPost =
				anchorElement.querySelector(`#tm_input-delay-post`);
			if (inputClickToPost) {
				inputClickToPost.value =
					timeDelay.clickToPost || initialTimeDelay.clickToPost;
			}
			if (inputFillContent) {
				inputFillContent.value =
					timeDelay.fillContent || initialTimeDelay.fillContent;
			}
			if (inputFillFile) {
				inputFillFile.value = timeDelay.fillFile || initialTimeDelay.fillFile;
			}
			if (inputDelayPost) {
				inputDelayPost.value = timeDelay.post || initialTimeDelay.post;
			}
			if (inputOpenNewTab) {
				inputOpenNewTab.value =
					timeDelay.openNewTab || initialTimeDelay.openNewTab;
			}
		}

		await initialInputTimeDelay();

		const isDarkTheme = (await DB_getValue(KEY_IS_DARK_THEME)) || false;
		const body = document.querySelector(`body`);
		if (isDarkTheme) {
			body?.classList?.add("dark");
			body?.classList?.remove("light");
		} else {
			body?.classList?.remove("dark");
			body?.classList?.add("light");
		}
		const svgs = body.querySelectorAll(".tm_svg");
		svgs.forEach((svg) => {
			svg.setAttribute("fill", isDarkTheme ? "white" : "black");
		});

		const selectLanguage = document.querySelector(`#tm_select-language`);
		const lang = localStorage.getItem(KEY_LANGUAGE) || getLanguage();
		if (selectLanguage) {
			selectLanguage.value = lang.toLowerCase();
		}

		//...
		const gp = await DB_getValue(KEY_GROUPS_POSTED);
		if (!gp) {
			DB_setValue(KEY_GROUPS_POSTED, []);
		}

		const isDevMode = await DB_getValue(KEY_IS_DEVELOPER_MODE);
		if (isDevMode) {
			enabledElement({ selector: "#tm_btn-test-auto" });
			enabledElement({
				selector: "#tm_checkbox-is-test",
				isField: true,
				fieldSelector: "#tm_root .tm_field-container",
			});
			enabledElement({ selector: "#tm_btn-click" });
		} else {
			disabledElement({ selector: "#tm_btn-test-auto" });
			disabledElement({
				selector: "#tm_checkbox-is-test",
				isField: true,
				fieldSelector: "#tm_root .tm_field-container",
			});
			disabledElement({ selector: "#tm_btn-click" });
		}

		await updateDataSavedInfo();
	} catch (error) {
		logError("Error initialData: " + error);
		throw new Error("Error initialData: " + error);
	}
}

export { initialData };
