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
let isRememberWindowSize = false; // 默认不记住窗口大小
let isPopupVisible = false;

const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = chrome.runtime.getURL("style.css");
document.head.appendChild(link);

// 加载设置
chrome.storage.sync.get(['selectionEnabled', 'rememberWindowSize', 'windowSize'], function(data) {
  if (typeof data.selectionEnabled !== 'undefined') {
    isSelectionEnabled = data.selectionEnabled;
  }
  if (typeof data.rememberWindowSize !== 'undefined') {
    isRememberWindowSize = data.rememberWindowSize;
  }
});

// 监听设置变化
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync') {
    if (changes.selectionEnabled) {
      isSelectionEnabled = changes.selectionEnabled.newValue;
      if (!isSelectionEnabled) {
        removeIcon();
      }
    }
    if (changes.rememberWindowSize) {
      isRememberWindowSize = changes.rememberWindowSize.newValue;
    }
  }
});

function removeIcon() {
  if (currentIcon && document.body.contains(currentIcon)) {
    document.body.removeChild(currentIcon);
    currentIcon = null;
  }
}

// 更新安全的弹窗移除函数
function safeRemovePopup() {
  if (!currentPopup) {
    // 即使没有当前弹窗，也要确保状态被重置
    isPopupVisible = false;
    isCreatingPopup = false;
    window.aiResponseContainer = null;
    return;
  }

  try {
    // 保存窗口大小
    if (isRememberWindowSize && currentPopup.offsetWidth > 100 && currentPopup.offsetHeight > 100) {
      const width = currentPopup.offsetWidth;
      const height = currentPopup.offsetHeight;
      chrome.storage.sync.set({ windowSize: { width, height } });
    }

    // 清理所有观察者和事件监听器
    if (currentPopup._resizeObserver) {
      currentPopup._resizeObserver.disconnect();
    }
    if (currentPopup._mutationObserver) {
      currentPopup._mutationObserver.disconnect();
    }
    if (currentPopup._removeThemeListener) {
      currentPopup._removeThemeListener();
    }

    // 清理滚动相关实例
    if (window.aiResponseContainer?.perfectScrollbar) {
      window.aiResponseContainer.perfectScrollbar.destroy();
      delete window.aiResponseContainer.perfectScrollbar;
    }
    if (window.aiResponseContainer?.scrollStateManager?.cleanup) {
      window.aiResponseContainer.scrollStateManager.cleanup();
    }
    if (window.aiResponseContainer?.cleanup) {
      window.aiResponseContainer.cleanup();
    }

    // 使用 try-catch 包装 DOM 操作
    try {
      if (document.body.contains(currentPopup)) {
        document.body.removeChild(currentPopup);
      }
    } catch (e) {
      console.warn('Error removing popup from DOM:', e);
    }

    // 确保状态被重置
    window.aiResponseContainer = null;
    currentPopup = null;
    isPopupVisible = false;
    isCreatingPopup = false;
  } catch (error) {
    console.warn('Failed to remove popup:', error);
    // 确保在出错时也能重置所有状态
    if (document.body.contains(currentPopup)) {
      try {
        document.body.removeChild(currentPopup);
      } catch (e) {
        console.warn('Error removing popup in catch block:', e);
      }
    }
    window.aiResponseContainer = null;
    currentPopup = null;
    isPopupVisible = false;
    isCreatingPopup = false;
  }
}

function handlePopupCreation(selectedText, rect, hideQuestion = false) {
  if (isCreatingPopup) return;

  isCreatingPopup = true;

  try {
    safeRemovePopup();
    currentPopup = createPopup(selectedText, rect, hideQuestion);
    currentPopup.style.minWidth = '300px';
    currentPopup.style.minHeight = '200px';

    if (isRememberWindowSize) {
      chrome.storage.sync.get(['windowSize'], function(data) {
        if (data.windowSize &&
            data.windowSize.width >= 300 &&
            data.windowSize.height >= 200 &&
            currentPopup) {
          requestAnimationFrame(() => {
            currentPopup.style.width = `${data.windowSize.width}px`;
            currentPopup.style.height = `${data.windowSize.height}px`;
          });
        }
      });
    }

    document.body.appendChild(currentPopup);
    isPopupVisible = true;  // 更新状态

    // 设置窗口大小监听
    if (isRememberWindowSize && currentPopup) {
      setupResizeObserver(currentPopup);
    }
  } catch (error) {
    console.error('Error in handlePopupCreation:', error);
    safeRemovePopup();
  } finally {
    setTimeout(() => {
      isCreatingPopup = false;
    }, 100);
  }
}

// 添加切换窗口显示状态的函数
function togglePopup(selectedText, rect, hideQuestion = false) {
  try {
    if (isPopupVisible) {
      safeRemovePopup();
    } else {
      // 在创建新弹窗前确保清理旧的状态
      safeRemovePopup();
      handlePopupCreation(selectedText, rect, hideQuestion);
    }
  } catch (error) {
    console.warn('Error in togglePopup:', error);
    // 确保在出错时重置状态
    safeRemovePopup();
  }
}

// 添加防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
  if (request.action === "toggleChat") {
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      let rect;

      if (selection.rangeCount > 0 && (selectedText || request.selectedText)) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        rect = {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - 190,
          width: 0,
          height: 0
        };
      }

      const text = selectedText || request.selectedText || request.message;
      togglePopup(text, rect, !(selectedText || request.selectedText));
    } catch (error) {
      console.warn('Error handling toggleChat:', error);
      // 确保在出错时重置状态
      safeRemovePopup();
    }
  } else if (request.action === "getSelectedText") {
    sendResponse({ selectedText });
  }
});
