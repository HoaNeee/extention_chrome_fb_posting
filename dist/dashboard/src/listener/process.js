import { KEY_IS_IN_PROGRESS } from "../contants";
import { updateDataSavedInfo } from "../draw_element/dataSavedInfo";
import { getProgress, setProgress } from "../helpers/storage";
import { sleep } from "../utils/utils";

async function checkProcessingFroze() {
  let isProcesing = await getProgress();
  let time = 0;
  const max = (60 * 60) / 5;
  while (isProcesing) {
    await sleep(5000);
    if (time > max) {
      setProgress(false);
    }
    isProcesing = await getProgress();
    time++;
  }
}

export default function processListener(callback) {
  GM_addValueChangeListener(KEY_IS_IN_PROGRESS, (_, __, newVal) => {
    if (newVal) {
      checkProcessingFroze(); //no await here, just run in background and still continue next task
    }
    callback(newVal);
    updateDataSavedInfo();
  });
}
