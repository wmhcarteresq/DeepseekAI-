// 在文件开头添加调试日志

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getApiKeyAndLanguage") {
    chrome.storage.sync.get(["apiKey", "language"], function (data) {
      console.log('data', data);

      sendResponse({
        apiKey: data.apiKey || "",
        language: data.language || "auto",
      });
    });
    return true;
  } else if (request.action === "getModel") {
    chrome.storage.sync.get(["model"], function (data) {
      sendResponse({
        model: data.model || "r1", // 默认使用 R1 模型
      });
    });
    return true;
  } else if (request.action === "openPopup") {
    chrome.runtime.openOptionsPage();
    return true;
  }
});

// Create context menu on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "createPopup",
    title: "DeepSeek AI",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "createPopup") {
    chrome.tabs.sendMessage(tab.id, {
      action: "createPopup",
      selectedText: info.selectionText || null,
      message: info.selectionText || getGreeting()
    });
  }
});

// 全局注册命令监听器
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    // 获取选中的文本
    try {
      const [{result}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      chrome.tabs.sendMessage(tab.id, {
        action: "toggleChat",
        selectedText: result || null,
        message: result || getGreeting()
      });
    } catch (error) {
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleChat",
        selectedText: null,
        message: getGreeting()
      });
    }
  } else if (command === "close-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: "closeChat"
    });
  }
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning 👋";
  } else if (hour >= 12 && hour < 18) {
    return "Good afternoon 👋";
  } else {
    return "Good evening 👋";
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // 打开说明页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('Instructions/Instructions.html')
    });
  }
});
