import { KEY_IS_TEST, SCHEDULER_TYPE } from "../../../contants/contants.js";
import { logActions, logError, random } from "../../../utils/utils.js";
import {
	getSchedulerService,
	setSchedulerService,
} from "../services/scheduler-service.js";
import { DB_getValue } from "../utils/api-helper.js";

/**
 *
 * @param {Array<{h: number, m: number}>} schedulerTimes
 * @param {number|null} hours
 * @param {number|null} minutes
 * @returns
 */
function checkIsInTime(schedulerTimes, hours, minutes) {
	if (!hours) {
		hours = new Date().getHours();
	}

	if (!minutes) {
		minutes = new Date().getMinutes();
	}

	for (const time of schedulerTimes) {
		if (hours === time.h && minutes === time.m) {
			return true;
		}
	}

	return false;
}

async function checkScheduler() {
	const scheduler = await getSchedulerService();
	const date = new Date();
	const hours = date.getHours();
	const minutes = date.getMinutes();

	switch (scheduler.type) {
		case SCHEDULER_TYPE.DAILY_HOURS:
			return checkIsInTime(scheduler.dailyHours, hours, minutes);
		case SCHEDULER_TYPE.EVERY_MINUTES:
			return checkIsInTime(scheduler.schedulerMinutes, hours, minutes);
		case SCHEDULER_TYPE.EVERY_HOURS:
			return checkIsInTime(scheduler.schedulerHours, hours, minutes);
		case SCHEDULER_TYPE.FRAME_HOURS:
			return checkIsInTime(scheduler.frameHours, hours, minutes);
		default:
			return false;
	}
}

async function createSchedulerMinutes(val) {
	// Implementation for creating scheduler minutes
	val = Number(val);
	if (val < 0) {
		val = 1;
	}
	if (val > 59) val = 59;
	const newScheduler = [];
	const now = new Date();
	const oneMinute = 60 * 1000;
	let nextTime = new Date(now.getTime());
	let nextHoursTime = nextTime.getHours();

	let prevTime = new Date(now.getTime());
	let prevHoursTime = prevTime.getHours();

	const set = new Set();

	//
	if (prevHoursTime === nextHoursTime) {
		if (nextHoursTime === 23) {
			while (prevHoursTime !== 0) {
				prevTime = new Date(
					prevTime.getTime() - (val + random(0, 2)) * oneMinute,
				);
				prevHoursTime = prevTime.getHours();
				if (
					!set.has(`${prevTime.getHours()}:${prevTime.getMinutes()}`) &&
					prevHoursTime !== 0
				) {
					set.add(`${prevTime.getHours()}:${prevTime.getMinutes()}`);
					newScheduler.push({
						h: prevTime.getHours(),
						m: prevTime.getMinutes(),
					});
				}
			}

			if (!set.has(`${now.getHours()}:${now.getMinutes()}`)) {
				newScheduler.push({
					h: now.getHours(),
					m: now.getMinutes(),
				});
			}

			newScheduler.sort((a, b) => {
				if (a.h === b.h) {
					return a.m - b.m;
				}
				return a.h - b.h;
			});

			return newScheduler;
		}
		if (nextHoursTime === 0) {
			while (nextHoursTime !== 23) {
				nextTime = new Date(
					nextTime.getTime() + (val + random(0, 2)) * oneMinute,
				);
				nextHoursTime = nextTime.getHours();
				if (
					!set.has(`${nextTime.getHours()}:${nextTime.getMinutes()}`) &&
					nextHoursTime !== 23
				) {
					set.add(`${nextTime.getHours()}:${nextTime.getMinutes()}`);
					newScheduler.push({
						h: nextTime.getHours(),
						m: nextTime.getMinutes(),
					});
				}
			}

			if (!set.has(`${now.getHours()}:${now.getMinutes()}`)) {
				newScheduler.push({
					h: now.getHours(),
					m: now.getMinutes(),
				});
			}

			newScheduler.sort((a, b) => {
				if (a.h === b.h) {
					return a.m - b.m;
				}
				return a.h - b.h;
			});

			return newScheduler;
		}
	}

	while (prevHoursTime !== 23) {
		prevTime = new Date(prevTime.getTime() - (val + random(0, 2)) * oneMinute);
		prevHoursTime = prevTime.getHours();
		if (
			!set.has(`${prevTime.getHours()}:${prevTime.getMinutes()}`) &&
			prevHoursTime !== 23
		) {
			set.add(`${prevTime.getHours()}:${prevTime.getMinutes()}`);
			newScheduler.push({ h: prevTime.getHours(), m: prevTime.getMinutes() });
		}
	}

	while (nextHoursTime !== 0) {
		if (nextHoursTime === 0) break;
		nextTime = new Date(nextTime.getTime() + (val + random(0, 2)) * oneMinute);
		nextHoursTime = nextTime.getHours();
		if (
			!set.has(`${nextTime.getHours()}:${nextTime.getMinutes()}`) &&
			nextHoursTime !== 0
		) {
			set.add(`${nextTime.getHours()}:${nextTime.getMinutes()}`);
			newScheduler.push({ h: nextTime.getHours(), m: nextTime.getMinutes() });
		}
	}

	if (!set.has(`${now.getHours()}:${now.getMinutes()}`)) {
		newScheduler.push({
			h: now.getHours(),
			m: now.getMinutes(),
		});
	}

	newScheduler.sort((a, b) => {
		if (a.h === b.h) {
			return a.m - b.m;
		}
		return a.h - b.h;
	});

	return newScheduler;
}

function createSchedulerHours(val) {
	// Implementation for creating scheduler hours
	val = Number(val);
	if (val < 1) val = 1;
	if (val > 23) val = 23;
	const newScheduler = [];
	const now = new Date();
	const oneHours = 60 * 60 * 1000;
	let nextTime = new Date(now.getTime() + val * oneHours);
	let nextHoursTime = nextTime.getHours();
	const currentMinutes = now.getMinutes();
	const set = new Set();
	for (let i = 0; i < 24; i++) {
		nextTime = new Date(nextTime.getTime() + val * oneHours);
		nextHoursTime = nextTime.getHours();
		set.add(nextHoursTime);
	}
	set.forEach((h) => {
		newScheduler.push({ h, m: currentMinutes + random(0, 5) });
	});

	newScheduler.sort((a, b) => {
		if (a.h === b.h) {
			return a.m - b.m;
		}
		return a.h - b.h;
	});

	return newScheduler;
}

function createSchedulerDailyHours() {
	const newScheduler = [];
	for (let i = 0; i < 24; i++) {
		newScheduler.push({ h: i, m: 0 });
	}
	return newScheduler;
}

async function getSchedulerWithType(type) {
	const scheduler = await getSchedulerService();
	if (!type) {
		type = scheduler.type;
	}
	switch (type) {
		case "daily-hours":
			return scheduler.dailyHours;
		case "custom-every-minutes":
			return scheduler.schedulerMinutes;
		case "custom-every-hours":
			return scheduler.schedulerHours;
		case "custom-frame-hours":
			return scheduler.frameHours;
		default:
			return [];
	}
}

function convertFrameHours(val) {
	if (!val || typeof val !== "string") {
		throw new Error("Invalid value for frame hours");
	}
	if (!val.includes(":")) {
		throw new Error(
			"Invalid format for frame hours, expected format: '1:00,2:00,...'",
		);
	}

	const time = val.split(":");

	const h = Number(time[0].trim());
	const m = Number(time[1].trim());

	if (
		Number.isNaN(h) ||
		Number.isNaN(m) ||
		h < 0 ||
		h > 23 ||
		m < 0 ||
		m > 59
	) {
		throw new Error(
			"Invalid format for frame hours, hours and minutes should be numbers",
		);
	}

	return { h: Number(time[0].trim()), m: Number(time[1].trim()) };
}

function getListFrameHours(strs) {
	try {
		if (!strs || typeof strs !== "string") {
			throw new Error("Invalid value for frame hours");
		}
		const times = strs.split(",").map((s) => s.trim());
		const frameHours = [];
		for (const time of times) {
			const { h, m } = convertFrameHours(time);
			frameHours.push({ h, m });
		}
		return frameHours;
	} catch (error) {
		throw error;
	}
}

async function getNextTimePost() {
	try {
		const schedulers = await getSchedulerWithType();
		if (!schedulers || !schedulers.length) {
			return null;
		}
		const now = Date.now();
		let ans = null;
		const oneMinute = 1000 * 60;
		const isTest = await DB_getValue(KEY_IS_TEST);
		let diff = oneMinute;
		if (!isTest) {
			diff = oneMinute * 4;
		}
		for (const time of schedulers) {
			const t = new Date(new Date().setHours(time.h, time.m, 0, 0)).getTime();
			if (t > now + diff) {
				ans = t;
				break;
			}
		}
		if (!ans) {
			ans = new Date(new Date().setDate(new Date().getDate() + 1)).setHours(
				schedulers[0].h,
				schedulers[0].m,
				0,
				0,
			);
		}
		if (!ans) {
			ans = new Date().getTime() + oneMinute * 60;
		}
		ans += random(-2, 2) * oneMinute;
		return ans;
	} catch (error) {
		logError("Error at getNextTimePost: ", error);
		return null;
	}
}

async function shuffleTimes() {
	function shuffle(times = [], diff = 0) {
		const set = new Set();
		try {
			const newTimes = [];
			times.forEach((item) => {
				let m = item.m + diff;
				let h = item.h;
				if (m < 0) {
					h--;
					if (h < 0) {
						h = 23;
					}
					m = 60 + m;
				}
				if (m > 59) {
					h++;
					if (h > 23) {
						h = 0;
					}
					m = m - 60;
				}

				if (!set.has(`${h}:${m}`)) {
					set.add(`${h}:${m}`);
					newTimes.push({
						h,
						m,
					});
				}
			});

			newTimes.sort((a, b) => {
				if (a.h === b.h) return a.m - b.m;
				return a.h - b.h;
			});
			return newTimes;
		} catch (error) {
			logError("Error at shuffle times: ", error);
			return [];
		}
	}

	const scheduler = await getSchedulerService();
	const type = scheduler.type;
	const rand = random(0, 10);
	const diff = random(-2, 2);
	const per = 8;
	if (rand > per) {
		if (
			type === SCHEDULER_TYPE.EVERY_MINUTES ||
			type === SCHEDULER_TYPE.EVERY_HOURS
		) {
			logActions("Shuffle scheduler times");
			const times =
				type === SCHEDULER_TYPE.EVERY_MINUTES
					? [...scheduler.schedulerMinutes]
					: [...scheduler.schedulerHours];

			const newTimes = shuffle(times, diff);

			if (type === SCHEDULER_TYPE.EVERY_MINUTES) {
				scheduler.schedulerMinutes = newTimes;
			} else {
				scheduler.schedulerHours = newTimes;
			}
			setSchedulerService(scheduler);
		}
	}
}

export {
	checkScheduler,
	getListFrameHours,
	createSchedulerMinutes,
	createSchedulerHours,
	createSchedulerDailyHours,
	getSchedulerWithType,
	convertFrameHours,
	getNextTimePost,
	shuffleTimes,
};
