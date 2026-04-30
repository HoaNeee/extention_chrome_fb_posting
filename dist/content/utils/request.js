import { STATUS_RESPONSE } from "../../contants/constant-extention";
import { logError } from "../../utils/utils";

async function sendMessage(type, data) {
  try {
    await chrome.runtime.sendMessage({
      type,
      data,
    });
  } catch (error) {
    throw new Error("Error at sendMessage: " + error);
  }
}

/**
 *
 * @param {string} type
 * @param {any} data
 * @returns {Promise<{status: string, data: any, message: string}>}
 */
async function sendMessageWithResponse(type, data) {
  try {
    const res = await chrome.runtime.sendMessage({
      type,
      data,
    });
    if (res?.status === STATUS_RESPONSE.FAIL) {
      throw new Error(
        res?.msg || res?.message || "Error at sendMessageWithResponse",
      );
    }
    return res;
  } catch (error) {
    throw new Error("Error at sendMessageWithResponse: " + error);
  }
}

export { sendMessage, sendMessageWithResponse };
