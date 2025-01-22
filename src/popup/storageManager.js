export class StorageManager {
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["apiKey", "language", "model", "selectionEnabled"],
        (data) => {
          resolve({
            apiKey: data.apiKey || '',
            language: data.language || 'zh',
            model: data.model || 'v3',
            selectionEnabled: typeof data.selectionEnabled === 'undefined' ? true : data.selectionEnabled
          });
        }
      );
    });
  }

  async saveLanguage(language) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ language }, resolve);
    });
  }

  async saveModel(model) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ model }, resolve);
    });
  }

  async saveSelectionEnabled(enabled) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ selectionEnabled: enabled }, resolve);
    });
  }
}