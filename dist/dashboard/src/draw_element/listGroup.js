import { KEY_INDEXS_GROUP_CHECKED } from "../../../contants/contants.js";
import { DB_getValue, DB_setValue } from "../utils/api-helper.js";
import { randomID } from "../../../utils/utils.js";

/**
 *
 * @param {Array<{id: string, title: string, name: string, contents: string[], files: Blob[]}>} groups
 * @returns {Promise<Array<HTMLDivElement>>}
 */
async function createDivListGroups(groups = []) {
	if (!groups || !Array.isArray(groups)) {
		groups = [];
	}
	try {
		const prefix = "tm_";
		const divs = [];
		const indexsChecked = (await DB_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];

		for (const group of groups) {
			const id = group.id || randomID();
			const div = document.createElement("div");
			div.style.display = "flex";
			div.style.gap = "4px";
			div.style.alignItems = "center";
			div.setAttribute("id", `${prefix}group-${id}`);
			div.setAttribute("data-group-id", id);

			const name = group.name || group.title || "No name";

			const convertTitle = name.replace(/\s/g, "-") + id;

			const checkbox = document.createElement("input");
			checkbox.setAttribute("type", "checkbox");
			checkbox.setAttribute("id", `${prefix}checkbox-${convertTitle}`);

			if (indexsChecked.includes(group.id)) {
				checkbox.checked = true;
			}

			const label = document.createElement("label");
			label.setAttribute("for", `${prefix}checkbox-${convertTitle}`);
			label.innerText = name;

			const btnView = document.createElement("span");
			btnView.setAttribute("id", `${prefix}btn-view-group`);
			btnView.classList.add(`${prefix}btn-fake`);
			btnView.classList.add("not-style");
			btnView.style.fontSize = "18px";
			btnView.style.cursor = "pointer";
			btnView.innerText = "👁";

			div.appendChild(checkbox);
			div.appendChild(label);
			div.appendChild(btnView);

			checkbox.addEventListener("change", async (e) => {
				const checked = e.target.checked;
				const indexs = (await DB_getValue(KEY_INDEXS_GROUP_CHECKED)) || [];
				const set = new Set(indexs);
				if (checked) {
					set.add(group.id);
				} else {
					set.delete(group.id);
				}
				DB_setValue(KEY_INDEXS_GROUP_CHECKED, Array.from(set));
			});

			divs.push(div);
		}

		return divs;
	} catch (error) {
		throw new Error("Error at createDivListGroups: " + error);
	}
}

export { createDivListGroups };
