import PerfectScrollbar from "perfect-scrollbar";
import { createSvgIcon } from "./icon";
import { initDraggable, resizeMoveListener } from "./drag";
import interact from "interactjs";
import { getAIResponse, getIsGenerating } from "./api";
import { setAllowAutoScroll, updateAllowAutoScroll, handleUserScroll, getAllowAutoScroll } from "./scrollControl";
import { isDarkMode, watchThemeChanges, applyTheme } from './theme';

// 新增：定义全局滚动相关的常量
const SCROLL_CONSTANTS = {
  SCROLL_THRESHOLD: 30,          // 滚动触发阈值
  COOLDOWN_DURATION: 150,        // 滚动冷却时间（毫秒）
  ANIMATION_DURATION: 300,       // 动画持续时间（毫秒）
  VELOCITY_THRESHOLD: 0.5,       // 速度阈值
  MAX_MOMENTUM_SAMPLES: 5        // 最大动量采样数
};

function updateLastAnswerIcons() {
  const aiResponseElement = document.getElementById("ai-response");
  const answers = aiResponseElement.getElementsByClassName("ai-answer");
  const aiResponseContainer = document.getElementById("ai-response-container");

  // 先移除所有重答图标
  Array.from(answers).forEach(answer => {
    const iconContainer = answer.querySelector('.icon-container');
    if (iconContainer) {
      const regenerateIcon = iconContainer.querySelector('img[src*="regenerate"]');
      if (regenerateIcon) {
        regenerateIcon.parentElement.remove(); // 移除整个图标包装器
        // 如果图标容器为空，则隐藏它
        if (iconContainer.children.length === 0) {
          iconContainer.style.display = 'none';
        }
      }
    }
  });

  // 为最后一个回答添加重答图标，但只在有用户问题时添加
  if (answers.length > 0) {
    const lastAnswer = answers[answers.length - 1];
    const userQuestion = lastAnswer.previousElementSibling;
    const iconContainer = lastAnswer.querySelector('.icon-container');

    // 只有当前面有用户问题时才添加重答按钮
    if (iconContainer && !iconContainer.querySelector('img[src*="regenerate"]') &&
        userQuestion && userQuestion.classList.contains("user-question")) {
      iconContainer.style.display = 'flex'; // 确保图标容器可见
      const regenerateWrapper = document.createElement("div");
      regenerateWrapper.className = "icon-wrapper tooltip";

      const regenerateIcon = document.createElement("img");
      regenerateIcon.src = chrome.runtime.getURL("icons/regenerate.svg");
      regenerateIcon.title = "重新回答";

      const regenerateTooltip = document.createElement("span");
      regenerateTooltip.className = "tooltiptext";
      regenerateTooltip.textContent = "重新回答";

      regenerateWrapper.appendChild(regenerateIcon);
      regenerateWrapper.appendChild(regenerateTooltip);

      regenerateWrapper.addEventListener("click", (event) => {
        event.stopPropagation();
        const questionText = userQuestion.textContent;

        // 清除内容和最小高度限制
        lastAnswer.style.minHeight = '0';
        lastAnswer.textContent = "";

        const abortController = new AbortController();

        // 获取或创建 PerfectScrollbar 实例
        let ps = aiResponseContainer.ps;
        if (!ps) {
          ps = new PerfectScrollbar(aiResponseContainer, {
            suppressScrollX: true,
            wheelPropagation: false,
          });
          aiResponseContainer.ps = ps;
        }

        // 重置滚动状态
        setAllowAutoScroll(true);

        // 立即滚动到问题位置
        requestAnimationFrame(() => {
          // 计算问题元素的位置
          const questionTop = userQuestion.offsetTop;
          // 设置滚动位置，使问题出现在容器顶部
          aiResponseContainer.scrollTop = Math.max(0, questionTop - 20);
          ps.update();
        });

        getAIResponse(
          questionText,
          lastAnswer,
          abortController.signal,
          ps,
          null,
          aiResponseContainer,
          true
        );
      });
      iconContainer.appendChild(regenerateWrapper);
    }
  }
}

// 添加到 window 对象
window.updateLastAnswerIcons = updateLastAnswerIcons;

export function addIconsToElement(element) {
  // 如果元素没有内容，直接返回不添加图标
  if (!element.textContent.trim()) {
    return;
  }

  // 如果已经有图标容器，先移除它
  const existingContainer = element.querySelector('.icon-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  const iconContainer = document.createElement("div");
  iconContainer.className = "icon-container";

  // 创建复制图标包装器
  const copyWrapper = document.createElement("div");
  copyWrapper.className = "icon-wrapper tooltip";

  const copyIcon = document.createElement("img");
  copyIcon.src = chrome.runtime.getURL("icons/copy.svg");
  copyIcon.title = "复制";

  const copyTooltip = document.createElement("span");
  copyTooltip.className = "tooltiptext";
  copyTooltip.textContent = "复制";

  copyWrapper.appendChild(copyIcon);
  copyWrapper.appendChild(copyTooltip);

  copyWrapper.addEventListener("click", (event) => {
    event.stopPropagation();
    // 直接获取文本内容，排除图标容器
    const textContent = Array.from(element.childNodes)
      .filter(node => !node.classList || !node.classList.contains('icon-container'))
      .map(node => node.textContent)
      .join('');

    navigator.clipboard.writeText(textContent).then(() => {
      copyIcon.style.transform = "scale(1.2)";
      setTimeout(() => {
        copyIcon.style.transform = "";
      }, 200);
    });
  });

  iconContainer.appendChild(copyWrapper);

  // 如果是 AI 回答，添加重答图标
  if (element.classList.contains("ai-answer")) {
    const userQuestion = element.previousElementSibling;
    // 只有当前面有用户问题时才添加重答按钮
    if (userQuestion && userQuestion.classList.contains("user-question")) {
      const regenerateWrapper = document.createElement("div");
      regenerateWrapper.className = "icon-wrapper tooltip";

      const regenerateIcon = document.createElement("img");
      regenerateIcon.src = chrome.runtime.getURL("icons/regenerate.svg");
      regenerateIcon.title = "重新回答";

      const regenerateTooltip = document.createElement("span");
      regenerateTooltip.className = "tooltiptext";
      regenerateTooltip.textContent = "重新回答";

      regenerateWrapper.appendChild(regenerateIcon);
      regenerateWrapper.appendChild(regenerateTooltip);

      regenerateWrapper.addEventListener("click", (event) => {
        event.stopPropagation();
        const questionText = userQuestion.textContent;
        element.textContent = "";
        const abortController = new AbortController();
        const aiResponseContainer = document.getElementById("ai-response-container");

        getAIResponse(
          questionText,
          element,
          abortController.signal,
          aiResponseContainer.perfectScrollbar,
          null,
          aiResponseContainer,
          true
        );
      });

      iconContainer.appendChild(regenerateWrapper);
    }
  }

  // 设置父元素样式
  element.style.position = "relative";
  element.style.paddingRight = "50px";

  // 默认隐藏图标容器
  iconContainer.style.display = "none";

  // 添加鼠标悬浮事件
  element.addEventListener("mouseenter", () => {
    iconContainer.style.display = "flex";
  });

  element.addEventListener("mouseleave", () => {
    iconContainer.style.display = "none";
  });

  element.appendChild(iconContainer);

  // 延迟一帧执行更新，确保 DOM 已经更新
  requestAnimationFrame(() => {
    updateLastAnswerIcons();
  });
}

// 添加到 window 对象
window.addIconsToElement = addIconsToElement;

export function createPopup(text, rect, hideQuestion = false) {
  const popup = document.createElement("div");
  popup.classList.add('theme-adaptive');

  // 初始化主题并立即输出状态
  const currentTheme = isDarkMode();
  applyTheme(popup, currentTheme);

  stylePopup(popup, rect);
  const aiResponseElement = document.createElement("div");
  const aiResponseContainer = document.createElement("div");
  styleResponseContainer(aiResponseContainer);

  // 添加 resize 手柄
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  popup.appendChild(resizeHandle);

  aiResponseElement.id = "ai-response";
  aiResponseElement.style.padding = "10px 30px 0";
  aiResponseElement.style.fontSize = "14px";

  // 只在不隐藏问题时添加问题元素
  if (!hideQuestion) {
    const userQuestionDiv = document.createElement('div');
    userQuestionDiv.className = 'user-question';
    const userQuestionP = document.createElement('p');
    userQuestionP.textContent = text;
    userQuestionDiv.appendChild(userQuestionP);
    addIconsToElement(userQuestionDiv);
    aiResponseElement.appendChild(userQuestionDiv);
  }

  // 添加初始的 AI 回答
  const initialAnswerElement = document.createElement("div");
  initialAnswerElement.className = "ai-answer";
  initialAnswerElement.textContent = "";
  addIconsToElement(initialAnswerElement);
  aiResponseElement.appendChild(initialAnswerElement);

  aiResponseContainer.style.paddingBottom = "10px";
  aiResponseContainer.appendChild(aiResponseElement);
  popup.appendChild(aiResponseContainer);

  // 创建并保存 PerfectScrollbar 实例
  const ps = new PerfectScrollbar(aiResponseContainer, {
    suppressScrollX: true,
    wheelPropagation: false,
    touchStartThreshold: 0,
    wheelEventTarget: aiResponseContainer,
    minScrollbarLength: 40,
    maxScrollbarLength: 300,
    swipeEasing: true,
    scrollingThreshold: 1000,
    wheelSpeed: 1
  });

  // 保存实例到容器上
  aiResponseContainer.perfectScrollbar = ps;

  // 设置主题监听
  const removeThemeListener = watchThemeChanges((isDark) => {
    applyTheme(popup, isDark);
  });

  document.body.appendChild(popup);

  let abortController = new AbortController();
  getAIResponse(
    text,
    initialAnswerElement,
    abortController.signal,
    ps,
    null,
    aiResponseContainer
  );

  // 优化滚动事件监听
  const handleScroll = () => {
    handleUserScroll();
    requestAnimationFrame(() => {
      ps.update();
      updateAllowAutoScroll(aiResponseContainer);
    });
  };

  aiResponseContainer.addEventListener('wheel', handleScroll, { passive: true });
  aiResponseContainer.addEventListener('touchstart', handleUserScroll, { passive: true });
  aiResponseContainer.addEventListener('scroll', handleScroll, { passive: true });

  const dragHandle = createDragHandle();
  popup.appendChild(dragHandle);

  // 设置拖拽和调整大小的功能
  setupInteractions(popup, dragHandle, aiResponseContainer);

  // 创建并设置关闭按钮
  const closeButton = popup.querySelector('.close-button');
  if (closeButton) {
    closeButton.onclick = () => {
      removeThemeListener();
      if (aiResponseContainer.perfectScrollbar) {
        aiResponseContainer.perfectScrollbar.destroy();
        delete aiResponseContainer.perfectScrollbar;
      }
      const popup = document.getElementById("ai-popup");
      if (popup) {
        document.body.removeChild(popup);
      }
    };
  }

  const questionInputContainer = createQuestionInputContainer(aiResponseContainer);
  popup.appendChild(questionInputContainer);
}

// 设置交互功能
function setupInteractions(popup, dragHandle, aiResponseContainer) {
  // 初始化拖拽
  initDraggable(dragHandle, popup);

  // 使用高级防抖函数，支持取消和立即执行
  const debounce = (fn, wait, options = {}) => {
    let timer = null;
    let lastArgs = null;
    let lastThis = null;

    return function debounced(...args) {
      const context = this;
      const later = () => {
        timer = null;
        if (!options.leading) {
          fn.apply(context, lastArgs);
        }
        lastArgs = lastThis = null;
      };

      if (!timer && options.leading) {
        fn.apply(context, args);
      } else {
        lastArgs = args;
        lastThis = context;
      }

      clearTimeout(timer);
      timer = setTimeout(later, wait);
    };
  };

  // 创建一个状态管理器
  const ResizeState = {
    previousDimensions: { width: 0, height: 0 },
    isExpanding: false,
    scrollPosition: 0,

    // 更新状态
    update(newWidth, newHeight) {
      this.isExpanding = newWidth > this.previousDimensions.width ||
                        newHeight > this.previousDimensions.height;
      this.previousDimensions = { width: newWidth, height: newHeight };
    },

    // 保存滚动位置
    saveScrollPosition(container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      this.isAtBottom = distanceFromBottom <= SCROLL_CONSTANTS.SCROLL_THRESHOLD;
      this.scrollPosition = scrollTop;
    },

    // 恢复滚动位置
    restoreScrollPosition(container) {
      if (this.isAtBottom || getIsGenerating()) {
        // 如果之前在底部或正在生成内容，保持在底部
        container.scrollTop = container.scrollHeight;
      } else {
        // 保持相对位置
        const scrollRatio = this.scrollPosition / container.scrollHeight;
        container.scrollTop = scrollRatio * container.scrollHeight;
      }
    },

    // 检查是否接近底部
    isNearBottom(container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      return scrollHeight - (scrollTop + clientHeight) <= SCROLL_CONSTANTS.SCROLL_THRESHOLD;
    }
  };

  // 处理滚动更新的函数
  const updateScroll = ({ width, height, ps = aiResponseContainer?.perfectScrollbar }) => {
    if (!aiResponseContainer) return;

    // 使用 ResizeObserver 监听尺寸变化
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // 更新状态
        ResizeState.update(width, height);

        // 保存当前滚动位置
        ResizeState.saveScrollPosition(aiResponseContainer);

        ps?.update();

        // 使用 RAF 确保平滑过渡
        requestAnimationFrame(() => {
          // 处理图标容器
          const visibleIconContainer = aiResponseContainer.querySelector('.icon-container[style*="display: flex"]');
          if (visibleIconContainer) {
            const containerRect = aiResponseContainer.getBoundingClientRect();
            const iconRect = visibleIconContainer.getBoundingClientRect();

            if (iconRect.bottom > containerRect.bottom) {
              aiResponseContainer.scrollTop += (iconRect.bottom - containerRect.bottom + 10);
            }
          }

          // 根据状态恢复滚动位置
          ResizeState.restoreScrollPosition(aiResponseContainer);
        });
      }
    });

    // 开始观察
    resizeObserver.observe(aiResponseContainer);

    // 设置新尺寸
    aiResponseContainer.style.height = `calc(${height}px - 60px)`;
    aiResponseContainer.style.width = `${width}px`;

    // 返回清理函数
    return () => resizeObserver.disconnect();
  };

  // 更新输入框容器位置
  const updateInputContainer = debounce(() => {
    const inputContainer = popup.querySelector('.input-container-wrapper');
    if (inputContainer) {
      Object.assign(inputContainer.style, {
        position: 'absolute',
        bottom: '0',
        width: '100%'
      });
    }
  }, 16, { leading: true });

  // 主要的resize处理函数
  const handleResize = event => {
    const cleanup = updateScroll({
      width: event.rect.width,
      height: event.rect.height,
      ps: aiResponseContainer?.perfectScrollbar
    });

    updateInputContainer();
    return cleanup;
  };

  // 保存上一次的清理函数
  let prevCleanup = null;

  // 设置resize交互
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
          min: { width: 300, height: 200 },
          max: { width: 900, height: 800 }
        })
      ],
      listeners: {
        move: event => {
          // 清理上一次的观察者
          if (prevCleanup) {
            prevCleanup();
          }

          // 更新移动状态
          resizeMoveListener(event);

          // 保存新的清理函数
          prevCleanup = handleResize(event);
        },
        end: () => {
          // 最后一次更新
          if (prevCleanup) {
            prevCleanup();
            prevCleanup = null;
          }
        }
      },
      autoScroll: false
    });
}

function createQuestionInputContainer(aiResponseContainer) {
  const container = document.createElement("div");
  container.className = "input-container-wrapper";

  container.innerHTML = `
    <div class="input-container">
      <textarea class="expandable-textarea" placeholder="输入您的问题..."></textarea>
      <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="loading-icon-wrapper tooltip">
        <svg class="loading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" stroke-width="2" fill="none" />
        </svg>
        <span class="tooltiptext">停止生成</span>
      </div>
    </div>
  `;

  const textarea = container.querySelector(".expandable-textarea");
  const sendIcon = container.querySelector(".send-icon");
  const loadingIconWrapper = container.querySelector(".loading-icon-wrapper");

  textarea.removeAttribute("style");
  textarea.classList.add("textarea-default");

  // 使用WeakMap存储私有状态
  const textareaState = new WeakMap();

  // 创建防抖函数
  const debounce = (fn, delay) => {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
      }, delay);
    };
  };

  // 创建节流函数
  const throttle = (fn, delay) => {
    let lastTime = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastTime >= delay) {
        fn.apply(this, args);
        lastTime = now;
      }
    };
  };

  // 初始化textarea状态
  const initTextareaState = (element) => {
    const state = {
      isComposing: false,
      lastHeight: 40,
      compositionText: '',
      originalValue: '',
      lock: false
    };
    textareaState.set(element, state);
    return state;
  };

  // 获取textarea状态
  const getState = (element) => {
    return textareaState.get(element) || initTextareaState(element);
  };

  // 实际执行高度更新的函数
  const performHeightUpdate = (element) => {
    const state = getState(element);
    if (state.lock) return;

    const valueToCheck = state.isComposing
      ? element.value + state.compositionText
      : element.value;

    // 空内容直接重置
    if (!valueToCheck.trim()) {
      element.style.height = "40px";
      return;
    }

    // 保存当前状态
    const selectionStart = element.selectionStart;
    const selectionEnd = element.selectionEnd;
    const scrollTop = element.scrollTop;

    // 检查是否有手动换行
    const hasNewline = valueToCheck.includes('\n');

    // 检查是否需要自动换行
    element.style.height = "40px";
    // 考虑padding的影响，一行文字的实际高度是20px (40px - 上下padding各10px)
    const needsWrap = element.scrollHeight > 40;

    if (hasNewline || needsWrap) {
      element.style.height = 'auto';
      const newHeight = Math.min(Math.max(element.scrollHeight, 40), 120);
      element.style.height = `${newHeight}px`;
      element.scrollTop = scrollTop;
      element.setSelectionRange(selectionStart, selectionEnd);
    }
  };

  // 处理输入法事件
  const handleComposition = (() => {
    const handlers = {
      compositionstart(event) {
        const state = getState(event.target);
        state.isComposing = true;
        state.compositionText = event.data || '';
        // 在输入法开始时锁定高度更新
        state.lock = true;
      },

      compositionupdate(event) {
        const state = getState(event.target);
        state.compositionText = event.data || '';
      },

      compositionend(event) {
        const state = getState(event.target);
        state.isComposing = false;
        state.compositionText = '';
        // 输入法结束后解锁并更新高度
        state.lock = false;
        // 使用 RAF 确保输入法完全结束后再更新高度
        requestAnimationFrame(() => {
          performHeightUpdate(event.target);
        });
      }
    };

    return (event) => {
      const handler = handlers[event.type];
      if (handler) {
        handler(event);
      }
    };
  })();

  // 事件监听器设置
  const setupEventListeners = (element) => {
    const options = { passive: true };

    // 输入法事件
    element.addEventListener("compositionstart", handleComposition, options);
    element.addEventListener("compositionupdate", handleComposition, options);
    element.addEventListener("compositionend", handleComposition, options);

    // 常规输入事件
    element.addEventListener("input", (event) => {
      const state = getState(event.target);
      if (!state.isComposing) {
        requestAnimationFrame(() => {
          performHeightUpdate(event.target);
        });
      }
    }, options);

    // 按键事件
    element.addEventListener("keydown", (event) => {
      const state = getState(event.target);
      if (event.key === "Enter") {
        if (!event.shiftKey && !state.isComposing) {
          event.preventDefault();
          if (!getIsGenerating()) {
            sendQuestion();
          }
        } else {
          // 当按下 Shift+Enter 时，立即触发高度更新
          requestAnimationFrame(() => {
            performHeightUpdate(event.target);
          });
        }
      }
    });
  };

  // 初始化textarea
  setupEventListeners(textarea);

  // 设置初始样式
  textarea.style.height = "40px";
  textarea.style.minHeight = "40px";
  textarea.style.maxHeight = "120px";

  const style = document.createElement('style');
  style.textContent = `
    .input-container-wrapper {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 10px 16px;
      background: inherit;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      z-index: 2;
      box-sizing: border-box;
    }

    .input-container {
      position: relative;
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .textarea-default {
      width: calc(100% - 40px);
      height: 40px;
      min-height: 40px;
      max-height: 120px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      resize: none;
      padding: 10px;
      line-height: 20px;
      font-size: 14px;
      word-wrap: break-word;
      word-break: break-all;
      white-space: pre-wrap;
      box-sizing: border-box;
      border-radius: 8px;
    }

    .loading-icon-wrapper {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 22px;
      height: 22px;
      cursor: pointer;
      display: none;  /* 默认隐藏 */
    }

    .loading-icon {
      width: 22px;
      height: 22px;
      color: currentColor;
      display: block;
    }

    .loading-icon-wrapper .tooltiptext {
      visibility: hidden;
      background-color: rgba(0, 0, 0, 0.8);
      color: #fff;
      text-align: center;
      border-radius: 6px;
      padding: 5px 10px;
      position: absolute;
      z-index: 1;
      width: max-content;
      bottom: 130%;
      left: 0%;
      transform: translateX(-50%);
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .loading-icon-wrapper .tooltiptext::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
    }

    .loading-icon-wrapper:hover .tooltiptext {
      visibility: visible;
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  function sendQuestion() {
    const state = getState(textarea);
    if (getIsGenerating() || state.isComposing) {
      return;
    }

    const question = textarea.value.trim();
    if (question) {
      sendQuestionToAI(question);
      textarea.value = "";
      textarea.style.height = "40px";
      textarea.style.minHeight = "40px";
      state.lastHeight = 40;
    }
  }

  function updateSendButtonState() {
    const sendIcon = container.querySelector(".send-icon");
    const loadingIconWrapper = container.querySelector(".loading-icon-wrapper");
    const textarea = container.querySelector(".expandable-textarea");

    if (getIsGenerating()) {
      sendIcon.style.display = "none";
      loadingIconWrapper.style.display = "block";
      textarea.style.cursor = "not-allowed";
      textarea.setAttribute("disabled", "disabled");
      textarea.setAttribute("placeholder", "AI正在回答中...");
    } else {
      sendIcon.style.display = "block";
      loadingIconWrapper.style.display = "none";
      textarea.style.cursor = "text";
      textarea.removeAttribute("disabled");
      textarea.setAttribute("placeholder", "输入您的问题...");
    }
  }

  // 添加状态检查的定时器
  setInterval(updateSendButtonState, 100);

  sendIcon.addEventListener("click", function() {
    if (!getIsGenerating()) {
      sendQuestion();
    }
  });

  loadingIconWrapper.addEventListener("click", function() {
    if (getIsGenerating()) {
      // 触发中断信号
      if (window.currentAbortController) {
        window.currentAbortController.abort();
      }
    }
  });

  return container;
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

  aiResponseContainer.scrollTop = aiResponseContainer.scrollHeight;

  // 使用已存在的 PerfectScrollbar 实例
  const ps = aiResponseContainer.perfectScrollbar;
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
  Object.assign(popup.style, {
    position: "absolute",
    width: "580px",
    height: "380px",
    paddingTop: "20px",
    backgroundColor: "var(--bg-primary)",
    boxShadow: "0 0 0 0.5px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.08)",
    backdropFilter: "blur(25px)",
    borderRadius: "12px",
    zIndex: "1000",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
    overflow: "hidden",
    userSelect: "none",
    "-webkit-user-select": "none",
    "-moz-user-select": "none",
    "-ms-user-select": "none",
    border: "1px solid var(--border-color)",
    transition: "transform 0.05s cubic-bezier(0.4, 0, 0.2, 1)",
    willChange: "transform, width, height",
    backfaceVisibility: "hidden",
    perspective: "1000px",
    transformStyle: "preserve-3d"
  });

  const { adjustedX, adjustedY } = adjustPopupPosition(rect, popup);
  popup.style.left = `${adjustedX}px`;
  popup.style.top = `${adjustedY}px`;

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

export function styleResponseContainer(container) {
  Object.assign(container.style, {
    position: "relative",
    width: "100%",
    height: "calc(100% - 60px)",
    marginTop: "20px",
    overflow: "auto",
    userSelect: "text",  // 允许选择文本内容
    "-webkit-user-select": "text",
    "-moz-user-select": "text",
    "-ms-user-select": "text",
  });
  container.id = "ai-response-container";

  // 创建滚动状态管理器
  const scrollStateManager = {
    isManualScrolling: false,
    lastScrollTime: 0,
    scrollTimeout: null,
    scrollRAF: null,
    // 新增：跟踪滚动动画状态
    scrollAnimation: {
      isAnimating: false,
      startTime: 0,
      startPosition: 0,
      targetPosition: 0,
      duration: SCROLL_CONSTANTS.ANIMATION_DURATION,
    },
    // 新增：滚动惯性追踪
    scrollMomentum: {
      velocity: 0,
      timestamp: 0,
      positions: [],
      maxSamples: SCROLL_CONSTANTS.MAX_MOMENTUM_SAMPLES,
    },

    // 设置手动滚动状态
    setManualScrolling(value) {
      this.isManualScrolling = value;
      if (value) {
        this.lastScrollTime = Date.now();
        this.scrollAnimation.isAnimating = false;
      }
    },

    // 新增：计算滚动速度
    updateScrollVelocity(currentPosition) {
      const now = Date.now();
      const momentum = this.scrollMomentum;

      momentum.positions.push({
        position: currentPosition,
        timestamp: now
      });

      if (momentum.positions.length > momentum.maxSamples) {
        momentum.positions.shift();
      }

      if (momentum.positions.length >= 2) {
        const newest = momentum.positions[momentum.positions.length - 1];
        const oldest = momentum.positions[0];
        const timeDiff = newest.timestamp - oldest.timestamp;

        if (timeDiff > 0) {
          momentum.velocity = (newest.position - oldest.position) / timeDiff;
        }
      }
    },

    // 新增：检查是否正在快速滚动
    isRapidScrolling() {
      return Math.abs(this.scrollMomentum.velocity) > SCROLL_CONSTANTS.VELOCITY_THRESHOLD;
    },

    // 检查是否在手动滚动冷却期
    isInCooldown() {
      return Date.now() - this.lastScrollTime < SCROLL_CONSTANTS.COOLDOWN_DURATION || this.isRapidScrolling();
    },

    // 保存滚动位置
    saveScrollPosition(container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      this.isAtBottom = distanceFromBottom <= SCROLL_CONSTANTS.SCROLL_THRESHOLD;
      this.scrollPosition = scrollTop;
    },

    // 恢复滚动位置
    restoreScrollPosition(container) {
      if (this.isAtBottom || getIsGenerating()) {
        container.scrollTop = container.scrollHeight;
      } else {
        const scrollRatio = this.scrollPosition / container.scrollHeight;
        container.scrollTop = scrollRatio * container.scrollHeight;
      }
    },

    // 检查是否接近底部
    isNearBottom(container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      return scrollHeight - (scrollTop + clientHeight) <= SCROLL_CONSTANTS.SCROLL_THRESHOLD;
    },

    // 清理所有计时器
    cleanup() {
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      if (this.scrollRAF) {
        cancelAnimationFrame(this.scrollRAF);
      }
      this.scrollAnimation.isAnimating = false;
      this.scrollMomentum.positions = [];
    }
  };

  // 保存状态管理器到容器实例
  container.scrollStateManager = scrollStateManager;

  // 优化的滚动处理函数
  const handleOptimizedScroll = (() => {
    let ticking = false;
    let lastScrollTop = container.scrollTop;
    let lastEventTime = Date.now();

    // 新增：使用 WeakMap 存储每个容器的去抖动配置
    const containerConfig = new WeakMap();

    // 新增：初始化容器配置
    containerConfig.set(container, {
      smoothingFactor: 0.2,  // 平滑因子
      minScrollDelta: 1,     // 最小滚动增量
      velocityThreshold: 0.5 // 速度阈值
    });

    return (event) => {
      const config = containerConfig.get(container);
      const now = Date.now();
      const timeDelta = now - lastEventTime;
      lastEventTime = now;

      // 如果是用户手动滚动
      if (event.type === 'wheel' || event.type === 'touchmove') {
        scrollStateManager.setManualScrolling(true);

        // 新增：更新滚动动量
        scrollStateManager.updateScrollVelocity(container.scrollTop);
      }

      // 防止在滚动动画进行时触发新的滚动
      if (scrollStateManager.isManualScrolling && scrollStateManager.isInCooldown()) {
        // 新增：如果是快速滚动，允许用户完全控制
        if (scrollStateManager.isRapidScrolling()) {
          event.stopPropagation();
          if (container.perfectScrollbar) {
            container.perfectScrollbar.update();
          }
          return;
        }
      }

      if (!ticking) {
        scrollStateManager.scrollRAF = requestAnimationFrame(() => {
          const currentScrollTop = container.scrollTop;
          const rawScrollDelta = currentScrollTop - lastScrollTop;

          // 新增：应用平滑处理
          const smoothedDelta = rawScrollDelta * config.smoothingFactor;
          const finalDelta = Math.abs(smoothedDelta) < config.minScrollDelta
            ? rawScrollDelta
            : smoothedDelta;

          // 只在滚动差值大于阈值时更新
          if (Math.abs(finalDelta) > config.minScrollDelta) {
            handleUserScroll();
            if (container.perfectScrollbar) {
              container.perfectScrollbar.update();
            }
            updateAllowAutoScroll(container);
            lastScrollTop = currentScrollTop;
          }

          ticking = false;
        });

        ticking = true;
      }

      // 重置手动滚动状态的延时器
      if (scrollStateManager.scrollTimeout) {
        clearTimeout(scrollStateManager.scrollTimeout);
      }

      scrollStateManager.scrollTimeout = setTimeout(() => {
        scrollStateManager.setManualScrolling(false);
        // 新增：清理滚动动量数据
        scrollStateManager.scrollMomentum.positions = [];
        scrollStateManager.scrollMomentum.velocity = 0;
      }, 150); // 150ms后重置状态
    };
  })();

  // 使用 passive 选项优化滚动性能
  container.addEventListener('wheel', handleOptimizedScroll, { passive: true });
  container.addEventListener('touchmove', handleOptimizedScroll, { passive: true });
  container.addEventListener('scroll', handleOptimizedScroll, { passive: true });

  // 在组件卸载时清理
  const cleanup = () => {
    container.scrollStateManager.cleanup();
    container.removeEventListener('wheel', handleOptimizedScroll);
    container.removeEventListener('touchmove', handleOptimizedScroll);
    container.removeEventListener('scroll', handleOptimizedScroll);
  };

  // 保存清理函数到容器实例
  container.cleanup = cleanup;
}

function adjustPopupPosition(rect, popup) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const popupWidth = parseInt(popup.style.width, 10);
  const popupHeight = parseInt(popup.style.height, 10);

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

  return { adjustedX, adjustedY };
}

function createDragHandle() {
  const dragHandle = document.createElement("div");
  Object.assign(dragHandle.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "40px",
    cursor: "move",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 10px",
    boxSizing: "border-box",
  });

  // 移除固定的背景色,改用CSS变量
  dragHandle.classList.add('drag-handle');

  const titleContainer = document.createElement("div");
  titleContainer.style.display = "flex";
  titleContainer.style.alignItems = "center";

  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/icon24.png");
  logo.style.height = "24px";
  logo.style.marginRight = "10px";

  const textNode = document.createElement("span");
  textNode.style.fontWeight = "bold";
  textNode.textContent = "DeepSeek AI";
  titleContainer.appendChild(logo);
  titleContainer.appendChild(textNode);

  const closeButton = document.createElement("button");
  Object.assign(closeButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
    transition: "all 0.2s ease",
    position: "absolute",
    right: "10px",
  });

  const closeIcon = document.createElement("img");
  closeIcon.src = chrome.runtime.getURL("icons/close.svg");
  closeIcon.style.width = "20px";
  closeIcon.style.height = "20px";

  closeButton.appendChild(closeIcon);
  dragHandle.appendChild(titleContainer);
  dragHandle.appendChild(closeButton);

  dragHandle.addEventListener("mouseenter", () => {
    closeButton.style.display = "block";
  });

  dragHandle.addEventListener("mouseleave", () => {
    closeButton.style.display = "none";
    closeIcon.src = chrome.runtime.getURL("icons/close.svg");
    closeButton.style.transform = "scale(1)";
  });

  closeButton.addEventListener("mouseenter", () => {
    closeIcon.src = chrome.runtime.getURL("icons/closeClicked.svg");
    closeButton.style.transform = "scale(1.1)";
  });

  closeButton.addEventListener("mouseleave", () => {
    closeIcon.src = chrome.runtime.getURL("icons/close.svg");
    closeButton.style.transform = "scale(1)";
  });

  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();

    setTimeout(() => {
      const popup = document.getElementById("ai-popup");
      if (popup) {
        document.body.removeChild(popup);
      }
    }, 200);
  });

  return dragHandle;
}

// 代码主题样式
const codeThemeStyles = `
  /* One Light 主题 */
  .theme-adaptive.light-mode .hljs-comment,
  .theme-adaptive.light-mode .hljs-quote {
    color: #a0a1a7;
    font-style: italic;
  }

  .theme-adaptive.light-mode .hljs-doctag,
  .theme-adaptive.light-mode .hljs-keyword,
  .theme-adaptive.light-mode .hljs-formula {
    color: #a626a4;
  }

  .theme-adaptive.light-mode .hljs-section,
  .theme-adaptive.light-mode .hljs-name,
  .theme-adaptive.light-mode .hljs-selector-tag,
  .theme-adaptive.light-mode .hljs-deletion,
  .theme-adaptive.light-mode .hljs-subst {
    color: #e45649;
  }

  .theme-adaptive.light-mode .hljs-literal {
    color: #0184bb;
  }

  .theme-adaptive.light-mode .hljs-string,
  .theme-adaptive.light-mode .hljs-regexp,
  .theme-adaptive.light-mode .hljs-addition,
  .theme-adaptive.light-mode .hljs-attribute,
  .theme-adaptive.light-mode .hljs-meta .hljs-string {
    color: #50a14f;
  }

  .theme-adaptive.light-mode .hljs-attr,
  .theme-adaptive.light-mode .hljs-variable,
  .theme-adaptive.light-mode .hljs-template-variable,
  .theme-adaptive.light-mode .hljs-type,
  .theme-adaptive.light-mode .hljs-selector-class,
  .theme-adaptive.light-mode .hljs-selector-attr,
  .theme-adaptive.light-mode .hljs-selector-pseudo,
  .theme-adaptive.light-mode .hljs-number {
    color: #986801;
  }

  .theme-adaptive.light-mode .hljs-symbol,
  .theme-adaptive.light-mode .hljs-bullet,
  .theme-adaptive.light-mode .hljs-link,
  .theme-adaptive.light-mode .hljs-meta,
  .theme-adaptive.light-mode .hljs-selector-id,
  .theme-adaptive.light-mode .hljs-title {
    color: #4078f2;
  }

  .theme-adaptive.light-mode .hljs-built_in,
  .theme-adaptive.light-mode .hljs-title.class_,
  .theme-adaptive.light-mode .hljs-class .hljs-title {
    color: #c18401;
  }

  /* One Dark 主题 */
  .theme-adaptive.dark-mode .hljs-comment,
  .theme-adaptive.dark-mode .hljs-quote {
    color: #5c6370;
    font-style: italic;
  }

  .theme-adaptive.dark-mode .hljs-doctag,
  .theme-adaptive.dark-mode .hljs-keyword,
  .theme-adaptive.dark-mode .hljs-formula {
    color: #c678dd;
  }

  .theme-adaptive.dark-mode .hljs-section,
  .theme-adaptive.dark-mode .hljs-name,
  .theme-adaptive.dark-mode .hljs-selector-tag,
  .theme-adaptive.dark-mode .hljs-deletion,
  .theme-adaptive.dark-mode .hljs-subst {
    color: #e06c75;
  }

  .theme-adaptive.dark-mode .hljs-literal {
    color: #56b6c2;
  }

  .theme-adaptive.dark-mode .hljs-string,
  .theme-adaptive.dark-mode .hljs-regexp,
  .theme-adaptive.dark-mode .hljs-addition,
  .theme-adaptive.dark-mode .hljs-attribute,
  .theme-adaptive.dark-mode .hljs-meta .hljs-string {
    color: #98c379;
  }

  .theme-adaptive.dark-mode .hljs-attr,
  .theme-adaptive.dark-mode .hljs-variable,
  .theme-adaptive.dark-mode .hljs-template-variable,
  .theme-adaptive.dark-mode .hljs-type,
  .theme-adaptive.dark-mode .hljs-selector-class,
  .theme-adaptive.dark-mode .hljs-selector-attr,
  .theme-adaptive.dark-mode .hljs-selector-pseudo,
  .theme-adaptive.dark-mode .hljs-number {
    color: #d19a66;
  }

  .theme-adaptive.dark-mode .hljs-symbol,
  .theme-adaptive.dark-mode .hljs-bullet,
  .theme-adaptive.dark-mode .hljs-link,
  .theme-adaptive.dark-mode .hljs-meta,
  .theme-adaptive.dark-mode .hljs-selector-id,
  .theme-adaptive.dark-mode .hljs-title {
    color: #61aeee;
  }

  .theme-adaptive.dark-mode .hljs-built_in,
  .theme-adaptive.dark-mode .hljs-title.class_,
  .theme-adaptive.dark-mode .hljs-class .hljs-title {
    color: #e6c07b;
  }
`;

const styles = `
  #ai-popup {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
  }

  #ai-response-container {
    flex: 1;
    min-height: 0;
    position: relative;
    margin-bottom: 60px;
  }

  .input-container-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 10px 16px;
    background: inherit;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    z-index: 2;
    box-sizing: border-box;
  }

  #ai-popup .resizable {
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  #ai-popup .resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    user-select: none;
    -webkit-user-select: none;
  }

  .theme-adaptive.light-mode #ai-popup {
    background-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1),
                0 10px 20px rgba(0, 0, 0, 0.05);
    color: #1d1d1f;
  }

  .theme-adaptive.dark-mode #ai-popup {
    background-color: rgba(28, 28, 30, 0.8);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3),
                0 10px 20px rgba(0, 0, 0, 0.2);
    color: #f5f5f7;
  }

  #ai-response {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .user-question {
    align-self: flex-end;
    background: linear-gradient(135deg, #0A84FF, #0077ED);
    color: white;
    border-radius: 15px;
    padding: 8px 10px;
    word-wrap: break-word;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .ai-answer {
    align-self: flex-start;
    border-radius: 15px;
    padding: 8px 10px;
    word-wrap: break-word;
    position: relative;
    transition: all 0.3s ease;
  }

  .theme-adaptive.light-mode .ai-answer {
    background-color: #f5f5f7;
    color: #1d1d1f;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .theme-adaptive.dark-mode .ai-answer {
    background-color: #2c2c2e;
    color: #f5f5f7;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .ai-answer pre {
    background-color: var(--code-block-bg);
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
    overflow-x: auto;
    font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
  }

  .theme-adaptive.light-mode .ai-answer pre {
    background-color: #fafafa;
    border: 1px solid #e6e6e6;
  }

  .theme-adaptive.dark-mode .ai-answer pre pre{
    background-color: #282c34;
    border: 1px solid #3d3d3d;
  }

  .input-container {
    position: relative;
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .expandable-textarea {
    width: calc(100% - 40px);
    height: 40px;
    min-height: 40px;
    max-height: 120px;
    padding: 10px;
    border-radius: 8px;
    resize: none;
    overflow-y: auto;
    transition: all 0.3s ease;
    font-size: 14px;
    line-height: 1.4;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
  }

  .theme-adaptive.light-mode .expandable-textarea {
    background-color: #f5f5f7;
    border: 1px solid #e6e6e6;
    color: #1d1d1f;
  }

  .theme-adaptive.dark-mode .expandable-textarea {
    background-color: #2c2c2e;
    border: 1px solid #3d3d3d;
    color: #f5f5f7;
  }

  .expandable-textarea:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 125, 250, 0.6);
  }

  .send-icon {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.3s ease;
    color: currentColor;
  }

  .theme-adaptive.light-mode .send-icon {
    color: #666666;
  }

  .theme-adaptive.dark-mode .send-icon {
    color: #a1a1a6;
  }

  .send-icon:hover {
    opacity: 1;
  }

  .drag-handle {
    background-color: transparent;
    border-bottom: 1px solid;
    transition: all 0.3s ease;
  }

  .theme-adaptive.light-mode .drag-handle {
    border-color: rgba(0, 0, 0, 0.1);
    color: #1d1d1f;
  }

  .theme-adaptive.dark-mode .drag-handle {
    border-color: rgba(255, 255, 255, 0.1);
    color: #f5f5f7;
  }

  /* 滚动条样式 */
  .ps__rail-y {
    background-color: transparent !important;
    width: 10px !important;
    opacity: 1 !important;
  }

  .ps__rail-y:hover {
    background-color: transparent !important;
  }

  .ps__thumb-y {
    width: 6px !important;
    right: 2px !important;
    border-radius: 3px !important;
    transition: background-color 0.3s ease !important;
  }

  .theme-adaptive.light-mode .ps__thumb-y {
    background-color: rgba(0, 0, 0, 0.2) !important;
  }

  .theme-adaptive.light-mode .ps__rail-y:hover .ps__thumb-y {
    background-color: rgba(0, 0, 0, 0.35) !important;
  }

  .theme-adaptive.dark-mode .ps__thumb-y {
    background-color: rgba(255, 255, 255, 0.2) !important;
  }

  .theme-adaptive.dark-mode .ps__rail-y:hover .ps__thumb-y {
    background-color: rgba(255, 255, 255, 0.35) !important;
  }

  /* 加载动画样式 */
  .loading-icon {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    display: none;
    color: currentColor;
  }

  .theme-adaptive.light-mode .loading-icon rect {
    fill: #666666;
    animation: loading-breathe-light 2s ease-in-out infinite;
  }

  .theme-adaptive.dark-mode .loading-icon rect {
    fill: #a1a1a6;
    animation: loading-breathe-dark 2s ease-in-out infinite;
  }

  @keyframes loading-breathe-light {
    0%, 100% {
      opacity: 0.6;
      transform: scale(0.95);
    }
    50% {
      opacity: 0.9;
      transform: scale(1);
    }
  }

  @keyframes loading-breathe-dark {
    0%, 100% {
      opacity: 0.6;
      transform: scale(0.95);
    }
    50% {
      opacity: 0.9;
      transform: scale(1);
    }
  }

  .loading-icon.active {
    display: block;
    animation: loading-breathe 2s ease-in-out infinite;
  }

  @keyframes loading-breathe {
    0%, 100% {
      opacity: 0.6;
      transform: translateY(-50%) scale(0.95);
    }
    50% {
      opacity: 0.9;
      transform: translateY(-50%) scale(1);
    }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
