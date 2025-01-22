import './styles/style.css';
import { createSvgIcon, createIcon } from "./components/IconManager";
import { createPopup } from "./popup";
import "perfect-scrollbar/css/perfect-scrollbar.css";

let currentIcon = null;
let isCreatingPopup = false;
let isHandlingIconClick = false;
let isSelectionEnabled = true; // 默认启用
let selectedText = "";
let currentPopup = null; // 新增：跟踪当前弹窗

const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = chrome.runtime.getURL("style.css");
document.head.appendChild(link);

// 加载设置
chrome.storage.sync.get(['selectionEnabled'], function(data) {
  if (typeof data.selectionEnabled !== 'undefined') {
    isSelectionEnabled = data.selectionEnabled;
  }
});

// 监听设置变化
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync' && changes.selectionEnabled) {
    isSelectionEnabled = changes.selectionEnabled.newValue;
    if (!isSelectionEnabled) {
      removeIcon();
    }
  }
});

function removeIcon() {
  if (currentIcon && document.body.contains(currentIcon)) {
    document.body.removeChild(currentIcon);
    currentIcon = null;
  }
}

function handlePopupCreation(selectedText, rect, hideQuestion = false) {
  if (isCreatingPopup) {
    return;
  }

  isCreatingPopup = true;

  // 如果存在当前弹窗，先移除
  if (currentPopup && document.body.contains(currentPopup)) {
    // 触发清理逻辑
    const closeButton = currentPopup.querySelector('.close-button');
    if (closeButton) {
      closeButton.click();
    } else {
      document.body.removeChild(currentPopup);
    }
    currentPopup = null;
  }

  // 创建新弹窗
  currentPopup = createPopup(selectedText, rect, hideQuestion);
  document.body.appendChild(currentPopup);

  setTimeout(() => {
    isCreatingPopup = false;
  }, 100);
}

function handleIconClick(e, selectedText, rect, selection) {
  e.stopPropagation();
  e.preventDefault();

  isHandlingIconClick = true;
  removeIcon();
  selection.removeAllRanges();
  handlePopupCreation(selectedText, rect);

  setTimeout(() => {
    isHandlingIconClick = false;
  }, 100);
}

document.addEventListener("mouseup", function (event) {
  if (!isSelectionEnabled || isCreatingPopup || isHandlingIconClick) return;

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText && event.button === 0) {
    removeIcon();

    requestAnimationFrame(() => {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;

      currentIcon = createIcon(x + 5, y - 25);

      currentIcon.addEventListener("mousedown", function(e) {
        handleIconClick(e, selectedText, rect, selection);
      }, { passive: false });

      document.body.appendChild(currentIcon);
    });
  }
}, { passive: true });

document.addEventListener("mousedown", function(e) {
  if (isHandlingIconClick) return;

  if (currentIcon && !currentIcon.contains(e.target)) {
    removeIcon();
    if (e.button === 0) {
      window.getSelection().removeAllRanges();
    }
  }
}, { passive: true });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createPopup") {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    let rect;

    if (selection.rangeCount > 0 && (selectedText || request.selectedText)) {
      rect = selection.getRangeAt(0).getBoundingClientRect();
    } else {
      // 如果没有选中文本，将弹窗放在页面中心
      rect = {
        left: window.innerWidth / 2 ,
        top: window.innerHeight / 2 - 190,
        width: 0,
        height: 0
      };
    }

    // 优先使用选中的文本，其次使用请求中的文本，最后使用问候语
    const text = selectedText || request.selectedText || request.message;
    handlePopupCreation(text, rect, !(selectedText || request.selectedText));
  } else if (request.action === "getSelectedText") {
    sendResponse({ selectedText });
  }
});
