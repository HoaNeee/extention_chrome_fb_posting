(() => {
  // dist/contants/contants.js
  var KEY_IS_SCROLL_DETECT_LIST_GROUP = "is_scroll_detect_list_group";
  var URL_DASHBOARD = "https://www.facebook.com/groups/joins/?nav_source=tab";
  var URL_LIST_GROUPS = "https://www.facebook.com/groups/joins/?nav_source=tab";
  function getHref() {
    return location.href;
  }
  var isDashboardTab = getHref() === URL_DASHBOARD;
  var isPostTab = !isDashboardTab && !getHref().includes("/groups/join") && !getHref().includes("/groups/feed") && !getHref().includes("/groups/discover") && getHref().includes("/groups/");

  // dist/content/utils/utils.js
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

  // dist/content/content-src.js
  async function main() {
    if (getIsMatchUrl(URL_LIST_GROUPS)) {
      const isGetList = await CL_getValue(KEY_IS_SCROLL_DETECT_LIST_GROUP);
      if (isGetList) {
        console.log("GET LIST GROUP");
      }
    }
  }
  main();
})();
