import {
  KEY_ALL_GROUPS,
  KEY_IS_SCROLL_DETECT_LIST_GROUP,
  URL_LIST_GROUPS,
} from "../contants/contants.js";
import { CL_getValue, getIsMatchUrl } from "./utils/utils.js";

async function main() {
  if (getIsMatchUrl(URL_LIST_GROUPS)) {
    const isGetList = await CL_getValue(KEY_IS_SCROLL_DETECT_LIST_GROUP);
    if (isGetList) {
      console.log("GET LIST GROUP");
      //do some thing
    }
  }
}

main();
