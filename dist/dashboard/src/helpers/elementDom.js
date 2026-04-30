function getAllFieldsSetting(root = document) {
  const inputMaxGroup = root.querySelector("#tm_input-max-group-per-time");
  const checkboxIsProcessing = root.querySelector(`#tm_checkbox-is-processing`);
  const checkboxIsTest = root.querySelector(`#tm_checkbox-is-test`);
  const checkboxIsScheduler = root.querySelector(`#tm_checkbox-is-scheduler`);

  const checkboxIsFixStealFocus = root.querySelector(
    `#tm_checkbox-is-fix-steal-focus`,
  );
  const checkboxIsShuffleSchedulerTime = root.querySelector(
    `#tm_checkbox-is-shuffle-scheduler-time`,
  );
  const checkboxIsReloadDashboard = root.querySelector(
    `#tm_checkbox-is-reload-dashboard`,
  );
  const inputStrictlyMatchTitleGroup = root.querySelector(
    `#tm_input-strictly-match-title-group`,
  );

  function setIsProcessing(val) {
    if (checkboxIsProcessing) {
      checkboxIsProcessing.checked = val;
    }
  }

  function setIsReloadDashboard(val) {
    if (checkboxIsReloadDashboard) {
      checkboxIsReloadDashboard.checked = val;
    }
  }

  function setIsTest(val) {
    if (checkboxIsTest) {
      checkboxIsTest.checked = val;
    }
  }

  function setMaxGroupPerTime(val) {
    if (inputMaxGroup) {
      inputMaxGroup.value = Number(val);
    }
  }

  function setScheduler(val) {
    if (checkboxIsScheduler) {
      checkboxIsScheduler.checked = val;
    }
  }

  function setIsFixStealFocus(val) {
    if (checkboxIsFixStealFocus) {
      checkboxIsFixStealFocus.checked = val;
    }
  }

  function setStrictlyMatchTitleGroup(val) {
    if (inputStrictlyMatchTitleGroup) {
      inputStrictlyMatchTitleGroup.value = val;
    }
  }

  function setIsShuffleSchedulerTime(val) {
    if (checkboxIsShuffleSchedulerTime) {
      checkboxIsShuffleSchedulerTime.checked = val;
    }
  }

  return {
    getMaxGroupPerTime: () => Number(inputMaxGroup.value),
    getIsProcessing: () => checkboxIsProcessing.checked,
    getIsTest: () => checkboxIsTest.checked,
    setIsProcessing: setIsProcessing,
    setIsTest: setIsTest,
    setMaxGroupPerTime: setMaxGroupPerTime,
    getScheduler: () => checkboxIsScheduler.checked,
    setScheduler: setScheduler,
    getIsFixStealFocus: () => checkboxIsFixStealFocus.checked,
    setIsFixStealFocus: setIsFixStealFocus,
    getStrictlyMatchTitleGroup: () => inputStrictlyMatchTitleGroup.value,
    setStrictlyMatchTitleGroup: setStrictlyMatchTitleGroup,
    getIsReloadDashboard: () => checkboxIsReloadDashboard.checked,
    setIsReloadDashboard: setIsReloadDashboard,
    getIsShuffleSchedulerTime: () => checkboxIsShuffleSchedulerTime.checked,
    setIsShuffleSchedulerTime: setIsShuffleSchedulerTime,
  };
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
  if (!selector) {
    return;
  }
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
  getAllFieldsSetting,
  disabledElement,
  enabledElement,
  hideElement,
  showElement,
};
