export class ApiKeyManager {
  constructor() {
    this.lastValidatedValue = '';
  }

  async validateApiKey(apiKey) {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello!" },
          ],
          stream: false,
        }),
      });
      return response.status !== 401;
    } catch {
      return false;
    }
  }

  async saveApiKey(apiKey) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ apiKey }, () => {
        this.lastValidatedValue = apiKey;
        resolve();
      });
    });
  }

  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["apiKey"], (data) => {
        resolve(data.apiKey || '');
      });
    });
  }
}