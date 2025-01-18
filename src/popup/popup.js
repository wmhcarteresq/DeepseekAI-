document.addEventListener("DOMContentLoaded", function () {
  const apiKeyInput = document.getElementById("apiKey");
  const saveButton = document.getElementById("saveButton");
  const errorMessage = document.getElementById("errorMessage");
  const toggleButton = document.getElementById("toggleVisibility");
  const iconSwitch = document.getElementById("iconSwitch");
  const languageSelect = document.getElementById("language");

  // Load saved API key and language preference
  chrome.storage.sync.get(["apiKey", "language"], function (data) {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    if (data.language) {
      languageSelect.value = data.language;
    }
  });

  toggleButton.addEventListener("click", function () {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      iconSwitch.src = "../icons/hiddle.svg";
    } else {
      apiKeyInput.type = "password";
      iconSwitch.src = "../icons/show.svg";
    }
  });

  function validateApiKey(apiKey, callback) {
    fetch("https://api.deepseek.com/chat/completions", {
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
    })
      .then((response) => {
        if (response.status === 401) {
          callback(false);
        } else {
          callback(true);
        }
      })
      .catch(() => {
        callback(false);
      });
  }

  // Save API key and language preference
  saveButton.addEventListener("click", function () {
    const apiKey = apiKeyInput.value.trim();
    const language = languageSelect.value;

    if (apiKey === "") {
      errorMessage.textContent = "api-key不能为空!";
      return;
    }

    validateApiKey(apiKey, function (isValid) {
      if (isValid) {
        chrome.storage.sync.set(
          { apiKey: apiKey, language: language },
          function () {
            errorMessage.textContent = "设置已保存!";
            setTimeout(function () {
              errorMessage.textContent = "";
            }, 2000);
          }
        );
      } else {
        errorMessage.textContent = "api-key无效!";
      }
    });
  });

  document.getElementById('shortcutSettings').addEventListener('click', (e) => {
    e.preventDefault();
    // 打开扩展管理页面
    chrome.tabs.create({
      url: "chrome://extensions/shortcuts"
    });
  });

  // 处理使用说明链接点击
  document.getElementById('instructionsLink').addEventListener('click', (e) => {
    e.preventDefault();
    const instructionsUrl = chrome.runtime.getURL('Instructions/Instructions.html');
    chrome.tabs.create({
      url: instructionsUrl
    });
  });
});
const translations = {
  zh: {
    headerTitle: "DeepSeek AI",
    apiKeyPlaceholder: "在此输入 API Key",
    apiKeyLink: "前往获取 API Key",
    preferredLanguageLabel: "首选语言",
    saveButton: "保存",
    shortcutSettingsText: "快捷键设置",
    shortcutDescription: "请前往设置快捷键",
    instructionsText: "使用说明",
  },
  en: {
    headerTitle: "DeepSeek AI",
    apiKeyPlaceholder: "Enter API Key here",
    apiKeyLink: "Get API Key",
    preferredLanguageLabel: "Preferred Language",
    saveButton: "Save",
    shortcutSettingsText: "Shortcut Settings",
    shortcutDescription: "Please configure shortcut keys",
    instructionsText: "Instructions",
  },
};

let currentLang = "zh";

const toggleLanguage = () => {
  currentLang = currentLang === "zh" ? "en" : "zh";
  updateContent();
};

const updateContent = () => {
  const langData = translations[currentLang];
  document.getElementById("header-title").textContent = langData.headerTitle;
  document.getElementById("apiKey").placeholder = langData.apiKeyPlaceholder;
  document.getElementById("apiKeyLink").textContent = langData.apiKeyLink;
  document.getElementById("preferredLanguageLabel").textContent =
    langData.preferredLanguageLabel;
  document.getElementById("saveButton").textContent = langData.saveButton;
  document.getElementById("shortcutSettingsText").textContent =
    langData.shortcutSettingsText;
  document.getElementById("shortcutDescription").textContent =
    langData.shortcutDescription;
  document.getElementById("instructionsText").textContent =
    langData.instructionsText;
};

document
  .getElementById("language-toggle")
  .addEventListener("click", toggleLanguage);

// 初始化内容
updateContent();