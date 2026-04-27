import { MAX_Z_INDEX } from "../../contants/contants";

let timeoutNotifyId = null;

const container = document.createElement("div");
const innerDiv = document.createElement("div");

function showNotify({ message, type = "info", duration = 3000 }) {
	innerDiv.textContent = message;
	container.style.opacity = "1";
	container.style.pointerEvents = "auto";
	innerDiv.style.fontSize = "16px";

	switch (type) {
		case "info":
			container.style.background = "white";
			container.style.color = "black";
			break;
		case "error":
			container.style.background = "#ff0001"; //red
			container.style.color = "#fff";
			break;
		case "success":
			container.style.background = "#4BB543"; //green
			container.style.color = "#fff";
			break;
		default:
			container.style.background = "white";
			container.style.color = "black";
			break;
	}

	clearExistingTimeout();
	timeoutNotifyId = setTimeout(() => {
		hideNotification();
		timeoutNotifyId = null;
	}, duration);
}

function hideNotification() {
	container.style.opacity = "0";
	container.style.pointerEvents = "none";
}

function clearExistingTimeout() {
	if (timeoutNotifyId) {
		clearTimeout(timeoutNotifyId);
		timeoutNotifyId = null;
	}
}

function notificationContainer({ anchorElem = document.body } = {}) {
	container.style.position = "absolute";
	container.style.top = "60px";
	container.style.left = "10px";
	container.style.zIndex = MAX_Z_INDEX + 1;
	container.style.background = "white";
	container.style.padding = "8px";
	container.style.boxShadow = "0 2px 10px rgba(0,0,0,0.7)";
	container.style.borderRadius = "3px";
	container.style.transition = "opacity 0.5s ease";
	container.setAttribute("id", "tm_notification_container");

	innerDiv.style.position = "relative";
	innerDiv.textContent = "This is a notification";
	innerDiv.setAttribute("id", "tm_notification_inner");

	hideNotification();

	container.appendChild(innerDiv);
	anchorElem.appendChild(container);

	return {
		clearExistingTimeout,
	};
}

export { notificationContainer, showNotify, hideNotification };
