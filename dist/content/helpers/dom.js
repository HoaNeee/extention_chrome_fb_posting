import {
  KEY_STOP_TASK,
  SELECTOR,
  SELECTOR_VI,
} from "../../contants/contants.js";
import { getLanguage, logError, random, sleep } from "../../utils/utils.js";

function checkIsUseEvaluate(selector = "") {
  return selector.includes(`//`);
}

async function waitForElement(selector, anchorElement = document, time = 0) {
  const isStopTask = await GM_getValue(KEY_STOP_TASK);
  if (time >= 50 || isStopTask) {
    return null;
  }

  if (checkIsUseEvaluate(selector)) {
    const node = document.evaluate(
      selector,
      anchorElement,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    )?.singleNodeValue;
    if (node) return node;
  } else {
    const el = anchorElement.querySelector(selector);
    if (el) {
      return el;
    }
  }

  await sleep(200);
  return await waitForElement(selector, anchorElement, time + 1);
}

/**
 * Find element by selector with evaluate or querySelector
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
function findElement(selector, anchorElem = document) {
  if (!selector) {
    return null;
  }
  if (checkIsUseEvaluate(selector)) {
    const node = document.evaluate(
      selector,
      anchorElem,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    )?.singleNodeValue;
    if (node) return node;
  } else {
    const el = document.querySelector(selector);
    if (el) return el;
  }

  return null;
}

function getIsExistDialog() {
  for (const selector of SELECTOR.dialog) {
    const dialog = document.querySelector(selector);
    if (dialog) return true;
  }
  return false;
}

async function findDivToPost(time = 0) {
  try {
    if (time >= 50) {
      return null;
    }
    const lang = getLanguage();
    const selectors =
      lang === "vi" ? SELECTOR_VI.elementsToPost : SELECTOR.elementsToPost;

    for (const selector of selectors) {
      const el = findElement(selector);
      if (el) {
        return el;
      }
    }

    await sleep(200);
    return await findDivToPost(time + 1);
  } catch (error) {
    logError("Error at findDivToPost: ", error);
    throw new Error("Error at findDivToPost: " + error);
  }
}

async function findDivCreatePostContainer() {
  try {
    const lang = getLanguage();
    const selectors =
      lang === "vi"
        ? SELECTOR_VI.elementsCreatePost
        : SELECTOR.elementsCreatePost;

    for (const selector of selectors) {
      const div = await waitForElement(selector);
      if (div) {
        return div?.parentElement?.parentElement || div?.parentElement || div;
      }
    }
    return null;
  } catch (error) {
    logError("Error at findDivCreatePostContainer: ", error);
    throw new Error("Error at findDivCreatePostContainer: " + error);
  }
}

async function findDivInputTextbox() {
  try {
    const div = await findDivCreatePostContainer();
    if (div) {
      const selectorEditors = SELECTOR.elementsTextBoxEditor;
      for await (const selector of selectorEditors) {
        const input = await waitForElement(
          selector,
          div.children?.[1] ||
            div?.children?.[0] ||
            div?.firstElementChild ||
            div,
        );
        if (input) return input;
      }
    }
    return null;
  } catch (error) {
    throw new Error("Error at findDivInputTextbox: " + error);
  }
}

async function findButtonPostAndClick() {
  try {
    const divContainer = await findDivCreatePostContainer();
    if (divContainer) {
      const lang = getLanguage();

      const selectors =
        lang === "vi" ? SELECTOR_VI.elementsPost : SELECTOR.elementsPost;

      for await (const selector of selectors) {
        const div = await waitForElement(
          selector,
          divContainer.lastElementChild,
        );
        if (div) {
          await sleep(random(2, 5) * 100);

          const evt = new MouseEvent("mouseover", {
            bubbles: true,
            cancelable: true,
          });
          div.dispatchEvent(evt);
          await sleep(random(2, 3) * 100);

          //MAYBE better than dispatchEvent
          div.click();
          return true;
        }
      }

      return false;
    }
  } catch (e) {
    logError("Error at findButtonPostAndClick: ", e);
    return false;
  }
}

function clickOutSideHideDialog() {
  const isExist = getIsExistDialog();
  if (!isExist) return;

  const selectorsDialog = SELECTOR.dialog;

  let isExistDialog = isExist;
  for (const selector of selectorsDialog) {
    if (isExistDialog) break;
    const dialog = findElement(selector);
    if (dialog) {
      isExistDialog = true;
    }
  }

  if (!isExistDialog) {
    return;
  }

  const lang = getLanguage();
  const selectors =
    lang === "vi"
      ? SELECTOR_VI.elementsCloseDialog
      : SELECTOR.elementsCloseDialog;

  for (const selector of selectors) {
    const closeElement = findElement(selector);
    if (closeElement) {
      closeElement.click();
      return;
    }
  }
}

function checkIsSpammed() {
  try {
    const lang = getLanguage();

    const selectors =
      lang === "vi" ? SELECTOR_VI.elementsSpammed : SELECTOR.elementsSpammed;

    for (const selector of selectors) {
      const node = findElement(selector);
      if (node) {
        return true;
      }
    }
    return false;
  } catch (error) {
    logError("Error at checkWasBeSpam: ", error);
    return false;
  }
}

/**
 * @param {{
 * selector: string,
 * isField: boolean,
 * fieldSelector: string,
 * isCheckbox: boolean,
 * }}
 * @returns {void}
 */
function disabledElement({
  selector = "",
  isField = false,
  fieldSelector = "",
  isCheckbox = false,
} = {}) {
  if (isField) {
    const field = document.querySelector(selector);
    if (field) {
      const container = field.closest(fieldSelector);
      if (container) {
        if (isCheckbox) {
          const checkbox = document.querySelector(selector);
          if (checkbox) {
            checkbox.checked = false;
          }
        }
        container.setAttribute("disabled", "");
        return;
      }
    }
    return;
  }
  const element = document.querySelector(selector);
  if (element) {
    element.setAttribute("disabled", "");
  }
}

/**
 * @param {{
 * selector: string,
 * isField: boolean,
 * fieldSelector: string
 * }}
 * @returns {void}
 */
function enabledElement(
  { selector = "", isField = false, fieldSelector = "" } = "",
) {
  if (isField) {
    const field = document.querySelector(selector);
    if (field) {
      const container = field.closest(fieldSelector);
      if (container) {
        container.removeAttribute("disabled");
        return;
      }
    }
    return;
  }
  const element = document.querySelector(selector);
  if (element) {
    element.removeAttribute("disabled");
  }
}

/**
 * Hide element
 * @param {string} selector
 * @param {HTMLElement} anchorElem
 */
function hideElement(selector = "", anchorElem = document) {
  const element = anchorElem.querySelector(selector);
  if (element) {
    element.style.display = "none";
    element.style.pointerEvents = "none";
  }
}

/**
 * Show element
 * @param {string} selector
 * @param {HTMLElement} anchorElem
 */
function showElement(selector = "", anchorElem = document) {
  const element = anchorElem.querySelector(selector);
  if (element) {
    element.style.display = "block";
    element.style.pointerEvents = "auto";
  }
}

export {
  waitForElement,
  findDivToPost,
  findDivCreatePostContainer,
  findDivInputTextbox,
  findButtonPostAndClick,
  getIsExistDialog,
  clickOutSideHideDialog,
  disabledElement,
  enabledElement,
  hideElement,
  showElement,
  findElement,
  checkIsSpammed,
};
