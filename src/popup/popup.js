import { ApiKeyManager } from './apiKeyManager.js';
import { BalanceManager } from './balanceManager.js';
import { I18nManager } from './i18n.js';
import { UiManager } from './uiManager.js';
import { StorageManager } from './storageManager.js';

class PopupManager {
  constructor() {
    this.apiKeyManager = new ApiKeyManager();
    this.balanceManager = new BalanceManager();
    this.i18nManager = new I18nManager();
    this.uiManager = new UiManager();
    this.storageManager = new StorageManager();

    this.initializeEventListeners();
    this.loadInitialState();
  }

  async loadInitialState() {
    const settings = await this.storageManager.getSettings();

    if (settings.apiKey) {
      this.uiManager.setApiKeyValue(settings.apiKey);
      this.apiKeyManager.lastValidatedValue = settings.apiKey;
      this.handleBalanceRefresh();
    }

    this.uiManager.elements.languageSelect.value = settings.language;
    this.uiManager.elements.modelSelect.value = settings.model;
    this.uiManager.elements.selectionEnabled.checked = settings.selectionEnabled;
    this.uiManager.elements.rememberWindowSize.checked = settings.rememberWindowSize;
    this.uiManager.elements.pinWindow.checked = settings.pinWindow;
  }

  initializeEventListeners() {
    // API Key visibility toggle
    this.uiManager.elements.toggleButton.addEventListener(
      "click",
      () => this.uiManager.toggleApiKeyVisibility()
    );

    // API Key validation
    this.uiManager.elements.apiKeyInput.addEventListener(
      "blur",
      () => this.handleApiKeyValidation()
    );

    // Language selection
    this.uiManager.elements.languageSelect.addEventListener(
      "change",
      (e) => this.storageManager.saveLanguage(e.target.value)
    );

    // Model selection
    this.uiManager.elements.modelSelect.addEventListener(
      "change",
      (e) => this.storageManager.saveModel(e.target.value)
    );

    // Selection enabled toggle
    this.uiManager.elements.selectionEnabled.addEventListener(
      "change",
      (e) => this.storageManager.saveSelectionEnabled(e.target.checked)
    );

    // Remember window size toggle
    this.uiManager.elements.rememberWindowSize.addEventListener(
      "change",
      (e) => this.storageManager.saveRememberWindowSize(e.target.checked)
    );

    // Pin window toggle
    this.uiManager.elements.pinWindow.addEventListener(
      "change",
      (e) => this.storageManager.savePinWindow(e.target.checked)
    );

    // Balance toggle
    this.uiManager.elements.balanceToggle.addEventListener(
      "click",
      () => this.handleBalanceToggle()
    );

    this.uiManager.elements.totalBalance.addEventListener(
      "click",
      () => this.handleBalanceToggle()
    );

    // Shortcut settings
    document.getElementById('shortcutSettings').addEventListener(
      'click',
      (e) => this.handleShortcutSettings(e)
    );

    // Instructions link
    document.getElementById('instructionsLink').addEventListener(
      'click',
      (e) => this.handleInstructionsLink(e)
    );
  }

  async handleApiKeyValidation() {
    const apiKey = this.uiManager.getApiKeyValue();

    if (apiKey === "" || apiKey === this.apiKeyManager.lastValidatedValue) {
      return;
    }

    this.uiManager.showMessage(
      this.i18nManager.getTranslation('validating'),
      true
    );

    const isValid = await this.apiKeyManager.validateApiKey(apiKey);

    if (isValid) {
      await this.apiKeyManager.saveApiKey(apiKey);
      this.uiManager.showMessage(
        this.i18nManager.getTranslation('saveSuccess'),
        true
      );
      this.handleBalanceRefresh();
    } else {
      this.uiManager.showMessage(
        this.i18nManager.getTranslation('apiKeyInvalid'),
        false
      );
    }
  }

  async handleBalanceRefresh() {
    if (this.balanceManager.isLoading()) return;

    const apiKey = await this.apiKeyManager.getApiKey();

    if (!apiKey) {
      this.uiManager.elements.totalBalance.textContent =
        this.i18nManager.getTranslation('noApiKey');
      return;
    }

    this.balanceManager.setLoading(true);
    this.uiManager.showLoadingState();

    try {
      const balanceData = await this.balanceManager.fetchBalance(apiKey);
      this.uiManager.updateBalanceDisplay(
        balanceData,
        this.i18nManager.getTranslation('noBalance')
      );
    } catch (error) {
      this.uiManager.elements.totalBalance.textContent =
        this.i18nManager.getTranslation('fetchError');
    } finally {
      this.balanceManager.setLoading(false);
    }
  }

  handleBalanceToggle() {
    const isVisible = this.uiManager.toggleBalance();
    if (isVisible && this.uiManager.elements.totalBalance.textContent === '--') {
      this.handleBalanceRefresh();
    }
  }

  handleShortcutSettings(e) {
    e.preventDefault();
    chrome.tabs.create({
      url: "chrome://extensions/shortcuts"
    });
  }

  handleInstructionsLink(e) {
    e.preventDefault();
    const instructionsUrl = chrome.runtime.getURL('Instructions/Instructions.html');
    chrome.tabs.create({
      url: instructionsUrl
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
  // 初始化界面语言
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
    selectionEnabledTip: "选中文本后显示快捷按钮，点击可快速打开会话窗口",
    validating: "正在验证...",
    rememberWindowSizeLabel: "保存窗口大小",
    rememberWindowSizeTip: "记住您调整后的会话窗口大小，下次打开时将保持相同尺寸",
    pinWindowLabel: "固定窗口",
    pinWindowTip: "开启后，点击窗口外部不会自动关闭会话窗口"
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
    selectionEnabledTip: "Show a quick button when text is selected to open the chat window",
    validating: "Validating...",
    rememberWindowSizeLabel: "Save Window Size",
    rememberWindowSizeTip: "Remember your preferred chat window size for future sessions",
    pinWindowLabel: "Pin Window",
    pinWindowTip: "When enabled, clicking outside the window won't close it"
  },
};

// 使用localStorage存储语言偏好
const getCurrentLang = () => localStorage.getItem('preferredLang') || 'en';
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
    'rememberWindowSizeLabel': langData.rememberWindowSizeLabel,
    'pinWindowLabel': langData.pinWindowLabel
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

  // 更新开关按钮的提示文本
  const switchTips = {
    'selectionEnabledLabel': langData.selectionEnabledTip,
    'rememberWindowSizeLabel': langData.rememberWindowSizeTip,
    'pinWindowLabel': langData.pinWindowTip
  };

  Object.entries(switchTips).forEach(([id, tip]) => {
    const element = document.getElementById(id);
    if (element) {
      element.setAttribute('data-tooltip', tip);
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
