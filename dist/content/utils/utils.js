import { URL_LIST_GROUPS } from "../../contants/contants.js";

function getIsMatchUrl(url) {
  if (!url) return false;
  return location.href === url;
}

async function CL_getValue(key, defaultValue = null) {
  try {
    const value = await GM_getValue(key);
    return value || defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

async function CL_setValue(key, value) {
  try {
    await GM_setValue(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

export { getIsMatchUrl, CL_getValue, CL_setValue };
