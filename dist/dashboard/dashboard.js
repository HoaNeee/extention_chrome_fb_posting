import { initLanguage, logError } from "../utils/utils.js";
import { createPanel } from "./src/draw_element/panel.js";
import { initialData } from "./src/helpers/initial.js";

async function main() {
	try {
		await initLanguage();
		const mainElement = document.querySelector("main");
		const root = document.querySelector(`#tm_root`);
		if (root) {
			root.style.display = "none";
			root.style.pointerEvents = "none";
		}
		createPanel(mainElement);
		await initialData(mainElement);

		root.style.display = "block";
		root.style.pointerEvents = "auto";
	} catch (error) {
		logError("Error at dashboard main: ", error);
	}
}

main();
