import { KEY_ADD_LOG } from "../../contants/constant-extention";
import {
  KEY_ALL_GROUPS,
  KEY_IS_SCROLL_DETECT_LIST_GROUP,
  KEY_STOP_TASK,
  SELECTOR,
  SELECTOR_RAW,
  SELECTOR_VI,
} from "../../contants/contants";
import {
  convertCorrectHref,
  getIsCorrectPostURL,
  getLanguage,
  logActions,
  logError,
  sleep,
} from "../../utils/utils";
import { sendMessage } from "../utils/request";
import { findElement, waitForElement } from "./dom";

async function getListElementContainer() {
  try {
    const lang = getLanguage();

    let divContainerList = null;

    const selectorsContainerList =
      lang === "vi"
        ? SELECTOR_VI.listElementContainers
        : SELECTOR.listElementContainers;

    for (const selector of selectorsContainerList) {
      divContainerList = await waitForElement(selector);
      if (divContainerList) break;
    }

    let selectorGroupWaitingTexts = SELECTOR_VI.allGroupsJoinTexts;
    let spanExistGroupWaiting = null;
    //check have group waiting
    for (const selector of selectorGroupWaitingTexts) {
      spanExistGroupWaiting = findElement(selector);
      if (spanExistGroupWaiting) break;
    }

    const listItem = await waitForElement(`div[role="listitem"]:last-child`);
    let listElement = null;

    if (spanExistGroupWaiting) {
      const parentEl = listItem?.parentElement?.parentElement?.parentElement;
      listElement =
        parentEl?.children?.[1] || parentEl?.children?.[0] || parentEl;
    } else {
      listElement = listItem?.parentElement;
    }
    return listElement;
  } catch (error) {
    throw new Error("Error get list element container: " + error);
  }
}

function getLastItemElementListGroup(list) {
  try {
    if (list instanceof HTMLElement) {
      return list.children?.[list.children.length - 1];
    }
    if (list && Array.isArray(list) && list.length) {
      return list[list.length - 1];
    }
    return null;
  } catch (error) {
    throw new Error("Error get last item element in list group: " + error);
  }
}

function getAllListItemElement(list) {
  try {
    if (list instanceof HTMLElement) {
      return list.querySelectorAll(SELECTOR_RAW.listItems);
    }
    if (list && Array.isArray(list) && list.length) {
      return list;
    }
    return [];
  } catch (error) {
    throw new Error("Error get all list item elements: " + error);
  }
}

/**
 * @returns {Promise<Array<{title: string, href: string}>>}
 */
async function getListGroups() {
  try {
    const listElement = await getListElementContainer();

    const isScroll =
      (await GM_getValue(KEY_IS_SCROLL_DETECT_LIST_GROUP)) || false;
    if (isScroll) {
      await scrollDetectListGroups(listElement);
    } else {
      const allGroup = await GM_getValue(KEY_ALL_GROUPS);
      return allGroup || [];
    }

    const childs = getAllListItemElement(listElement);
    const list = [];
    for (const child of childs) {
      const as = child.querySelectorAll(`a[href][role="link"]`);
      const a = as[1];
      if (a) {
        const title = a.textContent;
        let href = a.getAttribute("href");

        //convert correct href (maybe have case href end not with / but correct url)
        href = convertCorrectHref(href);

        if (getIsCorrectPostURL(href)) {
          list.push({ title, href });
        }
      }
    }
    sendMessage(KEY_ADD_LOG, {
      vi: `Lấy danh sách nhóm thành công, tổng ${list.length} nhóm`,
      en: `Got ${list.length} groups successfully`,
    });
    return list;
  } catch (e) {
    sendMessage(KEY_ADD_LOG, {
      vi: `Lỗi khi lấy danh sách nhóm`,
      en: `Error when getting list groups`,
    });
    logError("Error get list group: " + e);
    throw new Error("Error get list group: " + e);
  }
}

async function scrollDetectListGroups(listContainer) {
  try {
    const lang = getLanguage();
    const selectorsContainerList =
      lang === "vi"
        ? SELECTOR_VI.listElementContainers
        : SELECTOR.listElementContainers;

    let listElement = null;
    for (const selector of selectorsContainerList) {
      listElement = await waitForElement(selector);
      if (listElement) break;
    }

    let selectorGroupWaitingTexts =
      lang === "vi"
        ? SELECTOR_VI.allGroupsJoinTexts
        : SELECTOR.allGroupsJoinTexts;

    let h2ExistGroupWaiting = null;
    //check have group waiting
    for (const selector of selectorGroupWaitingTexts) {
      h2ExistGroupWaiting = findElement(selector, listElement);
      if (h2ExistGroupWaiting) break;
    }

    let maxGroup = 50;

    if (h2ExistGroupWaiting) {
      const text = h2ExistGroupWaiting.textContent;
      const pt = new RegExp(`\\d+`, "i");
      const match = text.match(pt);
      if (match) {
        maxGroup = Number(match[0]);
      }
    }

    let i = 0;
    const duration = 3000;
    let currentGroup = 0;
    let lastCountGroup = currentGroup;

    while (i < 10 && currentGroup < maxGroup - 10) {
      let isStopTask = await GM_getValue(KEY_STOP_TASK);
      if (isStopTask) {
        logActions("Stop task -> stop scroll detect list groups");
        break;
      }

      const lastItem = getLastItemElementListGroup(listContainer);
      if (lastItem) {
        lastItem.scrollIntoView({ behavior: "smooth", block: "end" });
      }
      lastCountGroup = currentGroup;
      currentGroup = getAllListItemElement(listContainer)?.length || 0;
      if (lastCountGroup !== currentGroup) {
        i = 0;
      }

      await sleep(duration);

      //log
      console.log(currentGroup, maxGroup);
      window.dispatchEvent(new Event("scroll"));
      ++i;
    }
  } catch (error) {
    throw new Error("Error scroll detect list groups: " + error);
  }
}

export {
  getListElementContainer,
  getLastItemElementListGroup,
  getAllListItemElement,
  getListGroups,
};
