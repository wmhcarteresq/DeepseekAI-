import PerfectScrollbar from "perfect-scrollbar";
import interact from "interactjs";
import { getAIResponse, getIsGenerating } from "./services/apiService";
import { createDragHandle, initDraggable, resizeMoveListener } from "./components/DragHandle";
import { createQuestionInputContainer } from "./components/InputContainer";
import { styleResponseContainer } from "./components/ResponseContainer";
import { addIconsToElement, updateLastAnswerIcons } from "./components/IconManager";
import { createScrollManager, getAllowAutoScroll, setAllowAutoScroll, updateAllowAutoScroll, handleUserScroll, setupScrollHandlers, scrollToBottom } from './utils/scrollManager';
import { isDarkMode, watchThemeChanges, applyTheme } from './utils/themeManager';
import { STYLE_CONSTANTS } from './utils/constants';

// 将aiResponseContainer移动到window对象上
window.aiResponseContainer = null;

// 新增：定义全局滚动相关的常量
const SCROLL_CONSTANTS = {
  SCROLL_THRESHOLD: 30,          // 滚动触发阈值
  COOLDOWN_DURATION: 150,        // 滚动冷却时间（毫秒）
  ANIMATION_DURATION: 300,       // 动画持续时间（毫秒）
  VELOCITY_THRESHOLD: 0.5,       // 速度阈值
  MAX_MOMENTUM_SAMPLES: 5        // 最大动量采样数
};

const adjustPopupPosition = (rect) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const popupWidth = parseInt(STYLE_CONSTANTS.DEFAULT_POPUP_WIDTH);
  const popupHeight = parseInt(STYLE_CONSTANTS.DEFAULT_POPUP_HEIGHT);

  let adjustedX = rect.left + scrollX + rect.width / 2 - popupWidth / 2;
  let adjustedY = rect.top + scrollY + rect.height;

  if (adjustedY + popupHeight > viewportHeight + scrollY) {
    adjustedY = rect.top + scrollY - popupHeight;
  }

  adjustedX = Math.max(
    scrollX,
    Math.min(adjustedX, viewportWidth + scrollX - popupWidth)
  );
  adjustedY = Math.max(
    scrollY,
    Math.min(adjustedY, viewportHeight + scrollY - popupHeight)
  );

  return { left: `${adjustedX}px`, top: `${adjustedY}px` };
};

// 添加 getPopupInitialStyle 函数
const getPopupInitialStyle = (rect) => ({
  position: 'absolute',
  width: STYLE_CONSTANTS.DEFAULT_POPUP_WIDTH,
  height: STYLE_CONSTANTS.DEFAULT_POPUP_HEIGHT,
  paddingTop: STYLE_CONSTANTS.DEFAULT_PADDING_TOP,
  backgroundColor: 'var(--bg-primary)',
  boxShadow: '0 0 0 0.5px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.08)',
  backdropFilter: 'blur(25px)',
  borderRadius: '12px',
  zIndex: '1000',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  overflow: 'hidden',
  userSelect: 'none',
  border: '1px solid var(--border-color)',
  transition: 'transform 0.05s cubic-bezier(0.4, 0, 0.2, 1)',
  willChange: 'transform, width, height',
  backfaceVisibility: 'hidden',
  perspective: '1000px',
  transformStyle: 'preserve-3d',
  ...adjustPopupPosition(rect)
});

export function createPopup(text, rect, hideQuestion = false) {
  const popup = document.createElement("div");
  popup.id = "ai-popup";
  popup.classList.add('theme-adaptive');

  const currentTheme = isDarkMode();
  applyTheme(popup, currentTheme);

  Object.assign(popup.style, getPopupInitialStyle(rect));

  const aiResponseElement = document.createElement("div");
  window.aiResponseContainer = document.createElement("div");
  styleResponseContainer(window.aiResponseContainer);

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  popup.appendChild(resizeHandle);

  aiResponseElement.id = "ai-response";
  aiResponseElement.style.padding = "0px 30px 0";
  aiResponseElement.style.fontSize = "14px";

  if (!hideQuestion) {
    const userQuestionDiv = document.createElement('div');
    userQuestionDiv.className = 'user-question';
    const userQuestionP = document.createElement('p');
    userQuestionP.textContent = text;
    userQuestionDiv.appendChild(userQuestionP);
    addIconsToElement(userQuestionDiv);
    aiResponseElement.appendChild(userQuestionDiv);
  }

  const initialAnswerElement = document.createElement("div");
  initialAnswerElement.className = "ai-answer";
  initialAnswerElement.textContent = "";
  addIconsToElement(initialAnswerElement);
  aiResponseElement.appendChild(initialAnswerElement);

  window.aiResponseContainer.style.paddingBottom = "10px";
  window.aiResponseContainer.appendChild(aiResponseElement);
  popup.appendChild(window.aiResponseContainer);

  const ps = new PerfectScrollbar(window.aiResponseContainer, {
    suppressScrollX: true,
    wheelPropagation: false,
    touchStartThreshold: 0,
    wheelEventTarget: window.aiResponseContainer,
    minScrollbarLength: 40,
    maxScrollbarLength: 300,
    swipeEasing: true,
    scrollingThreshold: 1000,
    wheelSpeed: 1
  });

  window.aiResponseContainer.perfectScrollbar = ps;
  window.aiResponseContainer.scrollStateManager = createScrollManager();

  // 设置滚动处理器
  const cleanupScrollHandlers = setupScrollHandlers(window.aiResponseContainer, ps);
  window.aiResponseContainer.cleanup = () => {
    cleanupScrollHandlers();
    if (ps) {
      ps.destroy();
    }
    if (window.aiResponseContainer.scrollStateManager) {
      window.aiResponseContainer.scrollStateManager.cleanup();
    }
  };

  const removeThemeListener = watchThemeChanges((isDark) => {
    applyTheme(popup, isDark);
  });
  // 保存主题监听器清理函数到 popup 对象
  popup._removeThemeListener = removeThemeListener;

  document.body.appendChild(popup);

  let abortController = new AbortController();
  getAIResponse(
    text,
    initialAnswerElement,
    abortController.signal,
    ps,
    null,
    window.aiResponseContainer
  );

  const dragHandle = createDragHandle();
  popup.appendChild(dragHandle);

  setupInteractions(popup, dragHandle, window.aiResponseContainer);

  // 设置关闭按钮的处理逻辑
  const closeButton = popup.querySelector('.close-button');
  if (closeButton) {
    closeButton.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        // 移除主题监听器
        if (popup._removeThemeListener) {
          popup._removeThemeListener();
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

        // 确保popup还存在于文档中
        if (document.body.contains(popup)) {
          // 使用 requestAnimationFrame 确保在下一帧执行移除操作
          requestAnimationFrame(() => {
            if (document.body.contains(popup)) {
              document.body.removeChild(popup);
            }
            // 清理全局引用
            window.aiResponseContainer = null;
          });
        }
      } catch (error) {
        console.warn('Error during popup cleanup:', error);
        // 如果出错，仍然尝试移除popup
        if (document.body.contains(popup)) {
          document.body.removeChild(popup);
        }
        window.aiResponseContainer = null;
      }
    };
  }

  const questionInputContainer = createQuestionInputContainer(window.aiResponseContainer);
  popup.appendChild(questionInputContainer);

  return popup;
}

function setupInteractions(popup, dragHandle, aiResponseContainer) {
  initDraggable(dragHandle, popup);

  let prevCleanup = null;

  interact(popup)
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      margin: 5,
      inertia: {
        resistance: 3,
        minSpeed: 100,
        endSpeed: 50
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: STYLE_CONSTANTS.MIN_WIDTH, height: STYLE_CONSTANTS.MIN_HEIGHT },
          max: { width: STYLE_CONSTANTS.MAX_WIDTH, height: STYLE_CONSTANTS.MAX_HEIGHT }
        })
      ],
      listeners: {
        move: event => {
          if (prevCleanup) {
            prevCleanup();
          }

          resizeMoveListener(event);

          const cleanup = updateScroll({
            width: event.rect.width,
            height: event.rect.height,
            ps: aiResponseContainer?.perfectScrollbar
          });

          updateInputContainer(popup);
          prevCleanup = cleanup;
        },
        end: () => {
          if (prevCleanup) {
            prevCleanup();
            prevCleanup = null;
          }
        }
      },
      autoScroll: false
    });

  // 优化滚动事件监听
  const handleScroll = () => {
    handleUserScroll();
    requestAnimationFrame(() => {
      if (aiResponseContainer?.perfectScrollbar) {
        aiResponseContainer.perfectScrollbar.update();
      }
      updateAllowAutoScroll(aiResponseContainer);
    });
  };

  aiResponseContainer.addEventListener('wheel', handleScroll, { passive: true });
  aiResponseContainer.addEventListener('touchstart', handleUserScroll, { passive: true });
  aiResponseContainer.addEventListener('touchmove', handleScroll, { passive: true });
  aiResponseContainer.addEventListener('scroll', handleScroll, { passive: true });
}

function updateScroll({ width, height, ps }) {
  if (!window.aiResponseContainer) return;

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const stateManager = window.aiResponseContainer.scrollStateManager;

      stateManager.saveScrollPosition(window.aiResponseContainer);
      ps?.update();

      requestAnimationFrame(() => {
        const visibleIconContainer = window.aiResponseContainer.querySelector('.icon-container[style*="display: flex"]');
        if (visibleIconContainer) {
          const containerRect = window.aiResponseContainer.getBoundingClientRect();
          const iconRect = visibleIconContainer.getBoundingClientRect();

          if (iconRect.bottom > containerRect.bottom) {
            window.aiResponseContainer.scrollTop += (iconRect.bottom - containerRect.bottom + 10);
          }
        }

        stateManager.restoreScrollPosition(window.aiResponseContainer);
      });
    }
  });

  resizeObserver.observe(window.aiResponseContainer);

  window.aiResponseContainer.style.height = `calc(${height}px - 60px)`;
  window.aiResponseContainer.style.width = `${width}px`;

  return () => resizeObserver.disconnect();
}

function updateInputContainer(popup) {
  const inputContainer = popup.querySelector('.input-container-wrapper');
  if (inputContainer) {
    Object.assign(inputContainer.style, {
      position: 'absolute',
      bottom: '0',
      width: '100%'
    });
  }
}

function sendQuestionToAI(question) {
  const aiResponseElement = document.getElementById("ai-response");
  const aiResponseContainer = document.getElementById("ai-response-container");

  const userQuestionDiv = document.createElement('div');
  userQuestionDiv.className = 'user-question';
  const userQuestionP = document.createElement('p');
  userQuestionP.textContent = question;
  userQuestionDiv.appendChild(userQuestionP);
  addIconsToElement(userQuestionDiv);
  aiResponseElement.appendChild(userQuestionDiv);

  const answerElement = document.createElement("div");
  answerElement.className = "ai-answer";
  answerElement.textContent = "";
  addIconsToElement(answerElement);
  aiResponseElement.appendChild(answerElement);

  // 使用新的滚动方法
  if (aiResponseContainer) {
    scrollToBottom(aiResponseContainer);
  }

  const ps = aiResponseContainer?.perfectScrollbar;
  if (ps) {
    ps.update();
  }

  const abortController = new AbortController();
  getAIResponse(
    question,
    answerElement,
    abortController.signal,
    ps,
    null,
    aiResponseContainer
  );
}

export function stylePopup(popup, rect) {
  popup.id = "ai-popup";
  Object.assign(popup.style, adjustPopupPosition(rect));

  // 添加主题相关的样式类
  popup.classList.add('theme-adaptive');

  // 添加事件监听器来防止文本选择
  popup.addEventListener('mousedown', function(e) {
    if (e.target.closest('.resizable')) {
      e.preventDefault();
    }
  });

  // 添加mouseout事件处理器来阻止文本选择扩展到弹窗外部
  popup.addEventListener('mouseout', function(e) {
    // 检查鼠标是否真的离开了弹窗（不是移动到子元素）
    if (!e.relatedTarget || !popup.contains(e.relatedTarget)) {
      // 清除当前选择
      window.getSelection().removeAllRanges();
    }
  });

  // 添加自动滚动功能
  let autoScrollInterval = null;
  const scrollSpeed = 5; // 滚动速度
  const scrollThreshold = 30; // 触发滚动的边缘距离

  popup.addEventListener('mousemove', function(e) {
    const responseContainer = document.getElementById('ai-response-container');
    if (!responseContainer) return;

    // 使用 requestAnimationFrame 来优化滚动性能
    if (window.getSelection().toString()) {
      const popupRect = popup.getBoundingClientRect();
      const mouseY = e.clientY;
      const relativeY = mouseY - popupRect.top;

      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }

      if (relativeY < scrollThreshold) {
        autoScrollInterval = setInterval(() => {
          requestAnimationFrame(() => {
            responseContainer.scrollTop -= scrollSpeed;
          });
        }, 16);
      } else if (relativeY > popup.offsetHeight - scrollThreshold) {
        autoScrollInterval = setInterval(() => {
          requestAnimationFrame(() => {
            responseContainer.scrollTop += scrollSpeed;
          });
        }, 16);
      }
    }
  }, { passive: true });

  popup.addEventListener('mouseleave', () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }, { passive: true });

  document.addEventListener('mouseup', () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }, { passive: true });
}
