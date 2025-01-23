const translations = {
  zh: {
    title: "DeepSeek AI 使用说明",
    subtitle: "让 AI 助手为您的网页浏览体验增添智慧",
    quickStart: "快速开始",
    chromeInstall: "Chrome 商店安装",
    chromeDesc: "从 Chrome 网上应用店安装扩展",
    edgeInstall: "Edge 商店安装",
    edgeDesc: "从 Edge 网上应用店安装扩展",
    deepseekWebsite: "DeepSeek 官网",
    deepseekDesc: "访问 DeepSeek AI 官方网站",
    apiKey: "获取 API Key",
    apiDesc: "在 DeepSeek 平台获取您的 API 密钥",
    shortcuts: "快捷键设置",
    shortcutsDesc: "自定义扩展快捷键",
    github: "GitHub 仓库",
    githubDesc: "查看源代码和提交建议",
    installationSteps: [
      "在浏览器中安装 DeepSeek AI 扩展",
      "点击工具栏中的扩展图标",
      "输入您的 DeepSeek API 密钥",
      "选择您偏好的回答语言",
      "开启快捷按钮功能",
      "设置你偏好的快捷键",
      "在任意网页上选择文本，开始与 AI 对话！",
    ],
    usage: "使用方法",
    quickButton: "快捷按钮使用",
    quickButtonDesc: "在扩展设置中开启快捷按钮后，选中网页文本时会自动显示一个便捷的 AI 按钮。点击该按钮即可快速呼出会话窗口，让您的操作更加流畅。",
    shortcutUsage: "快捷键使用",
    shortcutUsageDesc:
      "无论是否选中文本，都可以直接使用自定义快捷键呼出对话窗口。",
    features: "功能特点",
    smartChat: "智能对话",
    smartChat1: "• 支持多轮对话，记住上下文",
    smartChat2: "• 实时流式响应，打字机效果",
    smartChat3: "• 支持重新生成回答",
    uiInteraction: "界面交互",
    uiInteraction1: "• 可拖拽调整窗口位置和大小",
    uiInteraction2: "• 支持 Markdown 格式化显示",
    uiInteraction3: "• 支持 LaTeX 数学公式渲染",
    uiInteraction4: "• 代码块一键复制",
    uiInteraction5: "• 支持代码高亮",
    personalization: "个性化设置",
    personalization1: "• 自定义AI回复语言偏好",
    personalization2: "• 深色模式自动适配",
    personalization3: "• 可配置快捷键",
    tips: "使用技巧",
    tip1: "💡 可自定义快捷键以更快地打开对话窗口",
    tip2: "💡 点击代码块右上角的复制按钮，可以快速复制代码片段",
    tip3: "💡 如果对 AI 的回答不满意，可以点击重新生成按钮获取新的答案",
    feedback: "反馈与支持",
    feedbackDesc:
      "如果您喜欢 DeepSeek AI 扩展，欢迎在 Chrome 网上应用商店评分和评论，期待您的反馈！",
    chromeFeedback: "前往 Chrome 商店",
    chromeFeedbackDesc: "为 DeepSeek AI 评分和评论",
    privacy: "隐私说明",
    privacyDesc:
      "重视您的隐私。DeepSeek AI 扩展只会在必要时发送您选中的文本到 API，不会收集或存储任何其他个人信息。您的 API 密钥仅保存在本地浏览器中。",
  },
  en: {
    title: "DeepSeek AI User Guide",
    subtitle: "Enhance your web browsing experience with AI assistance",
    quickStart: "Quick Start",
    chromeInstall: "Install from Chrome Web Store",
    chromeDesc: "Install the extension from Chrome Web Store",
    edgeInstall: "Install from Edge Add-ons",
    edgeDesc: "Install the extension from Edge Add-ons",
    deepseekWebsite: "DeepSeek Website",
    deepseekDesc: "Visit the official DeepSeek AI website",
    apiKey: "Get API Key",
    apiDesc: "Obtain your API key on the DeepSeek platform",
    shortcuts: "Shortcut Settings",
    shortcutsDesc: "Customize extension shortcuts",
    github: "GitHub Repository",
    githubDesc: "View source code and submit suggestions",
    installationSteps: [
      "Install the DeepSeek AI extension in your browser",
      "Click the extension icon in the toolbar",
      "Enter your DeepSeek API key",
      "Select your preferred response language",
      "Enable the Quick Button feature",
      "Set your preferred shortcut keys",
      "Select text on the webpage to start a conversation with AI!",
    ],
    usage: "Usage",
    quickButton: "Quick Button Usage",
    quickButtonDesc: "When the Quick Button is enabled in extension settings, an AI button will automatically appear when you select text on a webpage. Click this button to quickly open the chat window for a smoother experience.",
    shortcutUsage: "Shortcut Usage",
    shortcutUsageDesc:
      "Whether or not text is selected, you can directly use custom shortcuts to bring up the dialog window.",
    features: "Features",
    smartChat: "Smart Chat",
    smartChat1: "• Supports multi-turn conversations with context memory",
    smartChat2: "• Real-time streaming responses with typewriter effect",
    smartChat3: "• Supports regenerating responses",
    uiInteraction: "UI Interaction",
    uiInteraction1: "• Draggable and resizable window",
    uiInteraction2: "• Supports Markdown formatting",
    uiInteraction3: "• Supports LaTeX math rendering",
    uiInteraction4: "• One-click code block copying",
    uiInteraction5: "• Supports code highlighting",
    personalization: "Personalization",
    personalization1: "• Customize AI response language preference.",
    personalization2: "• Automatic dark mode adaptation",
    personalization3: "• Configurable shortcuts",
    tips: "Tips",
    tip1: "💡 Customizable shortcuts for faster opening of the chat window.",
    tip2: "💡 Click the copy button on the code block to quickly copy the code snippet.",
    tip3: "💡 If you're not satisfied with the AI's response, click the regenerate button to get a new answer.",
    feedback: "Feedback & Support",
    feedbackDesc:
      "If you like the DeepSeek AI extension, please rate and review it on the Chrome Web Store. We look forward to your feedback!",
    chromeFeedback: "Visit Chrome Web Store",
    chromeFeedbackDesc: "Rate and review DeepSeek AI",
    privacy: "Privacy Policy",
    privacyDesc:
      "We value your privacy. The DeepSeek AI extension only sends selected text to the API when necessary and does not collect or store any other personal information. Your API key is stored locally in your browser.",
  },
};

let currentLang = "en";

const toggleLanguage = () => {
  // 移除console.log("toggleLanguage")这种简单的日志
  console.log("Current language:", currentLang);
  currentLang = currentLang === "zh" ? "en" : "zh";
  console.log("Switching to:", currentLang);

  // 确保translations对象中有对应的语言数据
  const langData = translations[currentLang];
  if (!langData) {
    console.error("No translations found for", currentLang);
    return;
  }

  try {
    updateContent();
    console.log("Language switch completed");
  } catch (err) {
    console.error("Error updating content:", err);
  }
};

const updateContent = () => {
  const langData = translations[currentLang];
  document.getElementById("title").textContent = langData.title;
  document.getElementById("subtitle").textContent = langData.subtitle;
  document.getElementById("quick-start").textContent = langData.quickStart;
  document.getElementById("chrome-install").textContent =
    langData.chromeInstall;
  document.getElementById("chrome-desc").textContent = langData.chromeDesc;
  document.getElementById("edge-install").textContent = langData.edgeInstall;
  document.getElementById("edge-desc").textContent = langData.edgeDesc;
  document.getElementById("deepseek-website").textContent =
    langData.deepseekWebsite;
  document.getElementById("deepseek-desc").textContent = langData.deepseekDesc;
  document.getElementById("api-key").textContent = langData.apiKey;
  document.getElementById("api-desc").textContent = langData.apiDesc;
  document.getElementById("shortcuts").textContent = langData.shortcuts;
  document.getElementById("shortcuts-desc").textContent =
    langData.shortcutsDesc;
  document.getElementById("github").textContent = langData.github;
  document.getElementById("github-desc").textContent = langData.githubDesc;

  const steps = document.querySelectorAll("#installation-steps li");
  steps.forEach((step, index) => {
    step.textContent = langData.installationSteps[index];
  });

  document.getElementById("usage").textContent = langData.usage;
  document.getElementById("quick-button").textContent = langData.quickButton;
  document.getElementById("quick-button-desc").textContent = langData.quickButtonDesc;
  document.getElementById("shortcut-usage").textContent =
    langData.shortcutUsage;
  document.getElementById("shortcut-usage-desc").textContent =
    langData.shortcutUsageDesc;

  document.getElementById("features").textContent = langData.features;
  document.getElementById("smart-chat").textContent = langData.smartChat;
  document.getElementById("smart-chat-1").textContent = langData.smartChat1;
  document.getElementById("smart-chat-2").textContent = langData.smartChat2;
  document.getElementById("smart-chat-3").textContent = langData.smartChat3;
  document.getElementById("ui-interaction").textContent =
    langData.uiInteraction;
  document.getElementById("ui-interaction-1").textContent =
    langData.uiInteraction1;
  document.getElementById("ui-interaction-2").textContent =
    langData.uiInteraction2;
  document.getElementById("ui-interaction-3").textContent =
    langData.uiInteraction3;
  document.getElementById("ui-interaction-4").textContent =
    langData.uiInteraction4;
  document.getElementById("ui-interaction-5").textContent =
    langData.uiInteraction5;
  document.getElementById("personalization").textContent =
    langData.personalization;
  document.getElementById("personalization-1").textContent =
    langData.personalization1;
  document.getElementById("personalization-2").textContent =
    langData.personalization2;
  document.getElementById("personalization-3").textContent =
    langData.personalization3;

  document.getElementById("tips").textContent = langData.tips;
  document.getElementById("tip-1").textContent = langData.tip1;
  document.getElementById("tip-2").textContent = langData.tip2;
  document.getElementById("tip-3").textContent = langData.tip3;

  document.getElementById("feedback").textContent = langData.feedback;
  document.getElementById("feedback-desc").textContent = langData.feedbackDesc;
  document.getElementById("chrome-feedback").textContent =
    langData.chromeFeedback;
  document.getElementById("chrome-feedback-desc").textContent =
    langData.chromeFeedbackDesc;

  document.getElementById("privacy").textContent = langData.privacy;
  document.getElementById("privacy-desc").textContent = langData.privacyDesc;
};

document.addEventListener("DOMContentLoaded", () => {
  const langToggleBtn = document.getElementById("language-toggle");
  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", (e) => {
      e.preventDefault(); // 防止可能的默认行为
      console.log("Language toggle button clicked");
      toggleLanguage();
    });
    console.log("Language toggle button listener attached");
  } else {
    console.error("Language toggle button not found");
  }
});

document
  .getElementById("shortcuts-link")
  .addEventListener("click", function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });
