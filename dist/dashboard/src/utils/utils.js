import {
  KEY_IS_DEVELOPER_MODE,
  KEY_LANGUAGE,
  URL_DASHBOARD,
} from "../../../contants/contants.js";
import { GM_getValue, GM_setValue } from "./api-helper.js";

async function sleep(duration) {
  return await new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function now() {
  return Date.now();
}

/**
 *
 * @param {string} str string to convert
 * @returns {string} convert
 * @example cvString("xin chào") => "xin chao"
 */
function cvString(str) {
  return str
    .normalize("NFD") // Tách dấu ra khỏi chữ cái (ví dụ: á -> a + ´)
    .replace(/[\u0300-\u036f]/g, "") // Xóa các ký tự dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D") // Xử lý riêng chữ đ
    .replace(/[^a-zA-Z0-9\s]/g, "") // Loại bỏ ký tự đặc biệt, chỉ giữ lại chữ cái, số, khoảng trắng
    .replace(/\s+/g, " ") // Thay thế nhiều khoảng trắng bằng một khoảng trắng duy nhất
    .toLowerCase()
    .trim();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 *
 * @param {{ name: string, base64Data: string, type: string }} param0
 * @returns
 */
function parseBase64ToFile({ name, base64Data, type }) {
  const blob = parseBase64ToBlob({ name, base64Data, type });
  return new File([blob], name, { type: blob.type });
}

/**
 *
 * @param {{ name: string, base64Data: string, type: string }} objectURL
 * @returns
 */
function parseBase64ToBlob(objectURL) {
  const base64Data = objectURL.base64Data.split(",")[1];
  const binaryData = atob(base64Data);
  const len = binaryData.length;
  const uint8Array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }
  const blob = new Blob([uint8Array], { type: objectURL.type });

  const split = objectURL.name.split(".");

  //convert name again
  const name = randomID() + "." + split[split.length - 1];
  const file = new File([blob], name, { type: objectURL.type });
  return file;
}

/**
 *
 * @param {string} value string to split
 * @returns {Array<string>} array of string
 * @example getListTitle("xin chào, tôi là ai") => ["xin chào", "tôi là ai"]
 */
function getListTitle(value) {
  if (!value || !value.trim()) return [];

  return value
    .trim()
    .split(/,|\n/) //split by comma or newline
    .map((val) => cvString(val.trim()))
    .filter((val) => val.trim());
}

function getLanguage() {
  try {
    const html = document.documentElement;
    const lang = html.getAttribute("lang");
    return lang;
  } catch (e) {
    console.log("Error getlanguage: " + e);
  }
}

function isMatchURL(url) {
  const href = url;
  const currentHref = location.href;
  if (href !== currentHref) {
    return false;
  }
  return true;
}

function gotoDashboard() {
  location.href = URL_DASHBOARD;
}

function convertCorrectHref(href) {
  if (
    href &&
    typeof href === "string" &&
    href.charAt(href.length - 1) !== "/"
  ) {
    return href + "/";
  }
  return href;
}

function isCorrectURL(href) {
  if (!href || typeof href !== "string") {
    return false;
  }
  // https://www.facebook.com/groups/123456789/ or https://www.facebook.com/groups/123456789 or https://www.facebook.com/groups/namegroup
  const pattern = /^https:\/\/www\.facebook\.com\/groups\/[a-zA-Z0-9.]+\/?$/;
  return pattern.test(href);
}

function randomID() {
  return Math.random().toString(36).substring(2, 10);
}

async function logActions(...args) {
  let isDevMode = await GM_getValue(KEY_IS_DEVELOPER_MODE);
  if (isDevMode === undefined || isDevMode === null) {
    GM_setValue(KEY_IS_DEVELOPER_MODE, false);
    isDevMode = false;
  }
  if (!isDevMode) return;
  console.log(...args);
}

function logError(...args) {
  console.log(...args);
}

function shuffleArray(array = []) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    let temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function findMatch({ data = [], key = "key", value = "" }) {
  return data.find((item) => item[key] === value);
}

function getIsDashboardTab() {
  return location.href === URL_DASHBOARD;
}

function getTextWithLanguage({ vi, en }) {
  let lang = localStorage.getItem(KEY_LANGUAGE);
  if (!lang) {
    localStorage.setItem(KEY_LANGUAGE, getLanguage());
    lang = getLanguage();
  }

  return lang === "vi" ? vi : en;
}

export {
  sleep,
  random,
  now,
  cvString,
  fileToBase64,
  parseBase64ToBlob,
  getListTitle,
  getLanguage,
  isMatchURL,
  gotoDashboard,
  convertCorrectHref,
  isCorrectURL,
  randomID,
  logActions,
  findMatch,
  parseBase64ToFile,
  shuffleArray,
  logError,
  getIsDashboardTab,
  getTextWithLanguage,
};
