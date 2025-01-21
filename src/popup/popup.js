document.addEventListener("DOMContentLoaded", function () {
  const apiKeyInput = document.getElementById("apiKey");
  const errorMessage = document.getElementById("errorMessage");
  const toggleButton = document.getElementById("toggleVisibility");
  const iconSwitch = document.getElementById("iconSwitch");
  const languageSelect = document.getElementById("language");
  const modelSelect = document.getElementById("model");
  const selectionEnabled = document.getElementById("selectionEnabled");
  const currentLang = getCurrentLang();
  let lastValidatedValue = '';

  // Load saved API key, language preference, model and selection enabled state
  chrome.storage.sync.get(["apiKey", "language", "model", "selectionEnabled"], function (data) {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
      lastValidatedValue = data.apiKey;
      handleBalanceRefresh();
    }
    if (data.language) {
      languageSelect.value = data.language;
    }
    if (data.model) {
      modelSelect.value = data.model;
    } else {
      // 默认使用 R1 模型
      modelSelect.value = 'r1';
      chrome.storage.sync.set({ model: 'r1' });
    }
    if (typeof data.selectionEnabled !== 'undefined') {
      selectionEnabled.checked = data.selectionEnabled;
    } else {
      // 默认开启
      selectionEnabled.checked = true;
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
    const currentLang = getCurrentLang();
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

  // API Key 输入框失焦时自动验证
  apiKeyInput.addEventListener("blur", function () {
    const apiKey = apiKeyInput.value.trim();
    const currentLang = getCurrentLang();

    // 如果输入框为空或者值没有变化，不进行验证
    if (apiKey === "" || apiKey === lastValidatedValue) {
      return;
    }

    // 显示加载状态
    showMessage('<span class="loading"></span> ' + translations[currentLang].validating, true);

    validateApiKey(apiKey, function (isValid) {
      if (isValid) {
        chrome.storage.sync.set({ apiKey: apiKey }, function () {
          lastValidatedValue = apiKey;
          showMessage(translations[currentLang].saveSuccess, true);
          handleBalanceRefresh(); // 刷新余额显示
        });
      } else {
        showMessage(translations[currentLang].apiKeyInvalid, false);
      }
    });
  });

  // 语言选择自动保存
  languageSelect.addEventListener("change", function () {
    chrome.storage.sync.set({ language: languageSelect.value });
  });

  // 模型选择自动保存
  modelSelect.addEventListener("change", function () {
    chrome.storage.sync.set({ model: modelSelect.value });
  });

  // 快捷按钮开关自动保存
  selectionEnabled.addEventListener("change", function () {
    chrome.storage.sync.set({ selectionEnabled: selectionEnabled.checked });
  });

  function showMessage(message, isSuccess) {
    const messageContainer = document.querySelector('.input-container');
    if (!messageContainer) return;

    // 移除已存在的消息
    const oldMessage = document.querySelector('.error-message, .success-message');
    if (oldMessage) {
      oldMessage.remove();
    }

    // 创建新消息
    const messageDiv = document.createElement('div');
    messageDiv.className = isSuccess ? 'success-message' : 'error-message';
    messageDiv.innerHTML = message;

    // 插入到input-container的开头
    messageContainer.insertBefore(messageDiv, messageContainer.firstChild);

    // 如果不是加载状态消息，2秒后移除
    if (!message.includes('loading')) {
      setTimeout(() => {
        messageDiv.remove();
      }, 2000);
    }
  }

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

  // 余额查询和显示功能
  const balanceToggle = document.getElementById('balanceToggle');
  const balanceIcon = document.getElementById('balanceIcon');
  const balanceContent = document.getElementById('balanceContent');
  const totalBalance = document.getElementById('totalBalance');
  const balanceRefresh = document.getElementById('balanceRefresh');
  let isBalanceLoading = false;
  let isBalanceVisible = false;

  async function fetchBalance(apiKey) {
    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  function formatBalance(balance, currency) {
    const num = parseFloat(balance);
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY',
      minimumFractionDigits: 2
    }).format(num);
  }

  function showLoadingState() {
    totalBalance.innerHTML = '<span class="loading"></span>';
  }

  function updateBalanceDisplay(balanceData) {
    const currentLang = getCurrentLang();
    if (!balanceData.is_available) {
      totalBalance.textContent = translations[currentLang].noBalance;
      return;
    }

    const info = balanceData.balance_infos[0];
    totalBalance.textContent = formatBalance(info.total_balance, info.currency);
  }

  async function handleBalanceRefresh() {
    if (isBalanceLoading) return;

    const apiKey = await chrome.storage.sync.get('apiKey');
    const currentLang = getCurrentLang();

    if (!apiKey.apiKey) {
      totalBalance.textContent = translations[currentLang].noApiKey;
      return;
    }

    isBalanceLoading = true;
    showLoadingState();

    try {
      const balanceData = await fetchBalance(apiKey.apiKey);
      updateBalanceDisplay(balanceData);
    } catch (error) {
      totalBalance.textContent = translations[currentLang].fetchError;
    } finally {
      isBalanceLoading = false;
    }
  }

  function toggleBalance() {
    isBalanceVisible = !isBalanceVisible;
    balanceContent.classList.toggle('show');
    balanceIcon.src = isBalanceVisible ? '../icons/show.svg' : '../icons/hiddle.svg';

    if (isBalanceVisible && totalBalance.textContent === '--') {
      handleBalanceRefresh();
    }
  }

  balanceToggle.addEventListener('click', toggleBalance);
  totalBalance.addEventListener('click', toggleBalance);
  balanceRefresh.addEventListener('click', handleBalanceRefresh);

  // 初始加载时查询一次余额
  chrome.storage.sync.get('apiKey', function (data) {
    if (data.apiKey) {
      handleBalanceRefresh();
    }
  });

  // 初始化语言
  updateContent();
});

// 语言切换功能
const translations = {
  zh: {
    headerTitle: "DeepSeek AI",
    apiKeyPlaceholder: "在此输入 API Key",
    apiKeyLink: "前往获取 API Key",
    preferredLanguageLabel: "首选语言",
    modelLabel: "模型选择",
    saveButton: "保存",
    shortcutSettingsText: "快捷键设置",
    shortcutDescription: "请前往设置快捷键",
    instructionsText: "使用说明",
    balanceText: "余额",
    noBalance: "无可用余额",
    noApiKey: "请先设置API Key",
    fetchError: "查询失败",
    apiKeyEmpty: "请输入 API Key",
    apiKeyInvalid: "API Key 无效",
    saveSuccess: "设置已保存",
    selectionEnabledLabel: "快捷按钮",
    validating: "正在验证...",
  },
  en: {
    headerTitle: "DeepSeek AI",
    apiKeyPlaceholder: "Enter API Key here",
    apiKeyLink: "Get API Key",
    preferredLanguageLabel: "Preferred Language",
    modelLabel: "Model Selection",
    saveButton: "Save",
    shortcutSettingsText: "Shortcut Settings",
    shortcutDescription: "Please configure shortcut keys",
    instructionsText: "Instructions",
    balanceText: "Balance",
    noBalance: "No available balance",
    noApiKey: "Please set API Key first",
    fetchError: "Failed to fetch",
    apiKeyEmpty: "Please enter API Key",
    apiKeyInvalid: "Invalid API Key",
    saveSuccess: "Settings saved",
    selectionEnabledLabel: "Quick Button",
    validating: "Validating...",
  },
};

// 使用localStorage存储语言偏好
const getCurrentLang = () => localStorage.getItem('preferredLang') || 'zh';
const setCurrentLang = (lang) => localStorage.setItem('preferredLang', lang);

// 更新页面内容
const updateContent = () => {
  const currentLang = getCurrentLang();
  const langData = translations[currentLang];

  // 使用现代的DOM操作方法
  const elements = {
    'header-title': langData.headerTitle,
    'apiKey': { placeholder: langData.apiKeyPlaceholder },
    'apiKeyLink': langData.apiKeyLink,
    'preferredLanguageLabel': langData.preferredLanguageLabel,
    'modelLabel': langData.modelLabel,
    'saveButton': langData.saveButton,
    'shortcutSettingsText': langData.shortcutSettingsText,
    'shortcutDescription': langData.shortcutDescription,
    'instructionsText': langData.instructionsText,
    'balanceText': langData.balanceText,
    'selectionEnabledLabel': langData.selectionEnabledLabel,
  };

  // 批量更新DOM
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([attr, attrValue]) => {
          element[attr] = attrValue;
        });
      } else {
        element.textContent = value;
      }
    }
  });

  // 更新余额显示的文本（如果有错误状态）
  const balanceElement = document.getElementById('totalBalance');
  if (balanceElement) {
    const balanceText = balanceElement.textContent;
    const errorMessages = {
      '无可用余额': langData.noBalance,
      '请先设置API Key': langData.noApiKey,
      '查询失败': langData.fetchError,
    };

    if (errorMessages[balanceText]) {
      balanceElement.textContent = errorMessages[balanceText];
    }
  }

  // 更新select的值
  document.getElementById('language').value = currentLang;
};

// 界面国际化语言切换
document.getElementById('language-toggle').addEventListener('click', () => {
  const currentLang = getCurrentLang();
  const newLang = currentLang === 'zh' ? 'en' : 'zh';
  setCurrentLang(newLang);
  updateContent();  // 只更新界面文本
});

// 监听语言选择器的change事件，用于大模型语言设置
document.getElementById('language').addEventListener('change', (e) => {
  // 这里不需要调用 setCurrentLang 和 updateContent
  // 因为这个选择器只用于设置大模型的回复语言
  // 实际的保存会在点击保存按钮时进行
});
