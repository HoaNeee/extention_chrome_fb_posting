export default class Queue extends Array {
  constructor(arr = []) {
    super(...arr);
  }

  push(item) {
    super.push(item);
  }

  /**
   * @return the first element of the queue and removing it or null if the queue is empty
   */
  pop() {
    if (this.isEmpty()) {
      return null;
    }
    return this.shift();
  }

  /**
   * @return the first element of the queue without removing it or null if the queue is empty
   */
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this[0];
  }

  isEmpty() {
    return this.length === 0;
  }
}
