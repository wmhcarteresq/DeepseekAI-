export class StorageManager {
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["apiKey", "language", "model", "selectionEnabled", "rememberWindowSize", "pinWindow"],
        (data) => {
          resolve({
            apiKey: data.apiKey || '',
            language: data.language || 'en',
            model: data.model || 'v3',
            selectionEnabled: typeof data.selectionEnabled === 'undefined' ? true : data.selectionEnabled,
            rememberWindowSize: typeof data.rememberWindowSize === 'undefined' ? false : data.rememberWindowSize,
            pinWindow: typeof data.pinWindow === 'undefined' ? false : data.pinWindow
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

  async saveRememberWindowSize(enabled) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ rememberWindowSize: enabled }, resolve);
    });
  }

  async savePinWindow(enabled) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ pinWindow: enabled }, resolve);
    });
  }
}