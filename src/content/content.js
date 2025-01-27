import './styles/style.css';
import { createSvgIcon, createIcon } from "./components/IconManager";
import { createPopup } from "./popup";
import "perfect-scrollbar/css/perfect-scrollbar.css";
import { popupStateManager } from './utils/popupStateManager';

let currentIcon = null;
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

// 更新安全的弹窗移除函数
function safeRemovePopup() {
  // 立即重置所有状态
  popupStateManager.reset();

  if (!currentPopup) {
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
      delete currentPopup._resizeObserver;
    }
    if (currentPopup._mutationObserver) {
      currentPopup._mutationObserver.disconnect();
      delete currentPopup._mutationObserver;
    }
    if (currentPopup._removeThemeListener) {
      currentPopup._removeThemeListener();
      delete currentPopup._removeThemeListener;
    }

    // 清理滚动相关实例
    if (window.aiResponseContainer?.perfectScrollbar) {
      window.aiResponseContainer.perfectScrollbar.destroy();
      delete window.aiResponseContainer.perfectScrollbar;
    }
    if (window.aiResponseContainer?.scrollStateManager?.cleanup) {
      window.aiResponseContainer.scrollStateManager.cleanup();
      delete window.aiResponseContainer.scrollStateManager;
    }
    if (window.aiResponseContainer?.cleanup) {
      window.aiResponseContainer.cleanup();
      delete window.aiResponseContainer.cleanup;
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
    // 重置所有状态
    window.aiResponseContainer = null;
    currentPopup = null;
  }

  // 最后再次确保所有状态都被重置
  popupStateManager.reset();
}

function handlePopupCreation(selectedText, rect, hideQuestion = false) {
  if (popupStateManager.isCreating()) return;

  popupStateManager.setCreating(true);

  try {
    // 先移除快捷按钮
    removeIcon();
    // 清除选中的文本
    window.getSelection().removeAllRanges();

    safeRemovePopup();
    currentPopup = createPopup(selectedText, rect, hideQuestion, safeRemovePopup);
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
    popupStateManager.setVisible(true);  // 更新状态

    // 设置窗口大小监听
    if (isRememberWindowSize && currentPopup) {
      setupResizeObserver(currentPopup);
    }
  } catch (error) {
    console.error('Error in handlePopupCreation:', error);
    safeRemovePopup();
  } finally {
    setTimeout(() => {
      popupStateManager.setCreating(false);
    }, 100);
  }
}

function togglePopup(selectedText, rect, hideQuestion = false) {
  // 如果正在处理中，直接返回
  if (popupStateManager.isCreating()) return;

  try {
    if (popupStateManager.isVisible()) {
      safeRemovePopup();
      // 添加一个短暂的延迟，确保状态完全重置
      setTimeout(() => {
        popupStateManager.reset();
      }, 100);
    } else {
      // 在创建新弹窗前确保清理旧的状态
      safeRemovePopup();
      // 添加一个短暂的延迟，确保旧状态完全清理
      setTimeout(() => {
        handlePopupCreation(selectedText, rect, hideQuestion);
      }, 100);
    }
  } catch (error) {
    console.warn('Error in togglePopup:', error);
    // 确保在出错时重置状态
    safeRemovePopup();
    popupStateManager.reset();
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

// 添加 ResizeObserver 设置函数
function setupResizeObserver(popup) {
  if (!popup) return;

  // 如果已存在观察者，先断开连接
  if (popup._resizeObserver) {
    popup._resizeObserver.disconnect();
  }

  // 创建防抖的保存尺寸函数
  const debouncedSaveSize = debounce((width, height) => {
    if (width >= 300 && height >= 200) {
      chrome.storage.sync.set({ windowSize: { width, height } });
    }
  }, 500);

  // 创建新的 ResizeObserver
  popup._resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      debouncedSaveSize(width, height);
    }
  });

  // 开始观察
  popup._resizeObserver.observe(popup);
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
  if (!isSelectionEnabled || popupStateManager.isCreating() || isHandlingIconClick) return;

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

// 添加全局点击事件监听
document.addEventListener('mousedown', async (event) => {
  // 如果没有当前弹窗，直接返回
  if (!currentPopup) return;

  // 检查是否启用了固定窗口
  const isPinned = await chrome.storage.sync.get('pinWindow').then(result => result.pinWindow || false);

  // 如果启用了固定窗口，直接返回
  if (isPinned) return;

  // 检查点击区域
  const isClickInside = event.target.closest('#ai-popup') ||
                       event.target.closest('.icon-wrapper') ||
                       event.target.closest('.icon-container') ||
                       event.target.closest('.regenerate-icon');

  // 如果点击在弹窗内部或相关元素上，不关闭
  if (isClickInside) return;

  // 关闭弹窗
  safeRemovePopup();
});

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
