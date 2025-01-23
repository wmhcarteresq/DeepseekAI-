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

// 添加安全的弹窗移除函数
function safeRemovePopup() {
  if (!currentPopup) return;

  try {
    // 保存窗口大小
    if (isRememberWindowSize && currentPopup.offsetWidth > 100 && currentPopup.offsetHeight > 100) {
      const width = currentPopup.offsetWidth;
      const height = currentPopup.offsetHeight;
      chrome.storage.sync.set({ windowSize: { width, height } });
    }

    // 清理所有观察者
    if (currentPopup._resizeObserver) {
      currentPopup._resizeObserver.disconnect();
    }
    if (currentPopup._mutationObserver) {
      currentPopup._mutationObserver.disconnect();
    }

    // 移除主题监听器
    if (currentPopup._removeThemeListener) {
      currentPopup._removeThemeListener();
    }

    // 清理滚动条实例
    if (window.aiResponseContainer?.perfectScrollbar) {
      window.aiResponseContainer.perfectScrollbar.destroy();
      delete window.aiResponseContainer.perfectScrollbar;
    }

    // 清理滚动状态管理器
    if (window.aiResponseContainer?.scrollStateManager?.cleanup) {
      window.aiResponseContainer.scrollStateManager.cleanup();
    }

    // 移除事件监听器
    if (window.aiResponseContainer?.cleanup) {
      window.aiResponseContainer.cleanup();
    }

    // 使用 requestAnimationFrame 确保在下一帧执行移除操作
    requestAnimationFrame(() => {
      if (document.body.contains(currentPopup)) {
        document.body.removeChild(currentPopup);
      }
      // 清理全局引用
      window.aiResponseContainer = null;
      currentPopup = null;
    });
  } catch (error) {
    console.warn('Failed to remove popup:', error);
    // 如果出错，仍然尝试移除popup
    if (document.body.contains(currentPopup)) {
      document.body.removeChild(currentPopup);
    }
    window.aiResponseContainer = null;
    currentPopup = null;
  }
}

function handlePopupCreation(selectedText, rect, hideQuestion = false) {
  if (isCreatingPopup) {
    return;
  }

  isCreatingPopup = true;

  try {
    // 先移除现有弹窗
    safeRemovePopup();

    // 创建新弹窗
    currentPopup = createPopup(selectedText, rect, hideQuestion);

    // 设置最小尺寸以确保可用性
    currentPopup.style.minWidth = '300px';
    currentPopup.style.minHeight = '200px';

    // 如果启用了记住窗口大小，应用保存的大小
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

    // 如果启用了记住窗口大小，监听大小变化
    if (isRememberWindowSize && currentPopup) {
      const resizeObserver = new ResizeObserver(debounce((entries) => {
        const entry = entries[0];
        if (entry.contentRect.width >= 300 && entry.contentRect.height >= 200) {
          chrome.storage.sync.set({
            windowSize: {
              width: entry.contentRect.width,
              height: entry.contentRect.height
            }
          });
        }
      }, 500));

      // 保存观察者引用以便清理
      currentPopup._resizeObserver = resizeObserver;
      resizeObserver.observe(currentPopup);

      // 监听弹窗移除
      const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.removedNodes) {
            if (node === currentPopup) {
              resizeObserver.disconnect();
              mutationObserver.disconnect();
              currentPopup = null;
              return;
            }
          }
        }
      });

      // 保存观察者引用以便清理
      currentPopup._mutationObserver = mutationObserver;
      mutationObserver.observe(document.body, { childList: true });
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
  } else if (request.action === "closeChat") {
    safeRemovePopup();
  } else if (request.action === "getSelectedText") {
    sendResponse({ selectedText });
  }
});
