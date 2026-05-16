export class DataSavedDB {
  constructor(key) {
    this.dbName = "dataPostSavedDB";
    this.storeName = "dataPostSaved";
    this.KEY = key;
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Không dùng keyPath, tự quản lý key
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  // Lấy toàn bộ mảng data
  /**
   *
   * @returns {Promise<{data: any[]}>}
   */
  async getAllDataSaved() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.get(this.KEY);

      request.onsuccess = () => {
        // Nếu chưa có data thì trả về mảng rỗng
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Lưu toàn bộ mảng (ghi đè)
  /**
   *
   * @param {Array<{id: string, title: string, name: string, contents: string[], files: Blob[], priority: number}>} postsArray
   * @returns {Promise<void>}
   */
  async saveDataPosts(postsArray) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.put(postsArray, this.KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add a new post to the array
   * @param {{id: string, title: string, name: string, contents: string[], files: Blob[], priority: number}} newPost
   * @returns {Promise<string>}
   */
  async addDataPost(newPost) {
    const posts = await this.getAllDataSaved();

    posts.push(newPost);
    await this.saveDataPosts(posts);

    return newPost.id;
  }

  /**
   * Update data post by ID
   * @param {string} postId
   * @param {{id: string, title: string, name: string, contents: string[], files: Blob[], priority: number}} updatedData
   * @returns {Promise<void>}
   */
  async updateDataPost(postId, updatedData) {
    const posts = await this.getAllDataSaved();
    const index = posts.findIndex((p) => p.id === postId);

    if (index === -1) throw new Error("Post not found");

    posts[index] = { ...posts[index], ...updatedData };
    await this.saveDataPosts(posts);
  }

  /**
   * Delete data post by ID
   * @param {string} postId
   * @returns {Promise<void>}
   */
  async deleteDataPost(postId) {
    const posts = await this.getAllDataSaved();
    const filtered = posts.filter((p) => p.id !== postId);
    await this.saveDataPosts(filtered);
  }

  /**
   * Find data post by ID
   * @param {string} postId
   * @returns {Promise<{id: string, title: string, name: string, contents: string[], files: Blob[], priority: number} | null>}
   */
  async getDataPost(postId) {
    const posts = await this.getAllDataSaved();
    return posts.find((p) => p.id === postId);
  }

  // Clear tất cả
  /**
   *
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this.saveDataPosts([]);
  }
}
