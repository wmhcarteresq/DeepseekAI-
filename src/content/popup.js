import PerfectScrollbar from "perfect-scrollbar";
import { createSvgIcon } from "./icon";
import { dragMoveListener, resizeMoveListener } from "./drag";
import interact from "interactjs";
import { getAIResponse, getIsGenerating } from "./api";
import { setAllowAutoScroll, updateAllowAutoScroll } from "./scrollControl";
import { isDarkMode, watchThemeChanges, applyTheme } from './theme';

export function createPopup(text, rect, hideQuestion = false) {
  const popup = document.createElement("div");
  popup.classList.add('theme-adaptive');

  // 初始化主题并立即输出状态
  const currentTheme = isDarkMode();
  applyTheme(popup, currentTheme);
  console.log('[Popup Created]', {
    'Initial Theme': currentTheme ? 'Dark' : 'Light'
  });

  // 设置主题监听
  const removeThemeListener = watchThemeChanges((isDark) => {
    applyTheme(popup, isDark);
    console.log('[Theme Changed]', {
      'New Theme': isDark ? 'Dark' : 'Light',
      'Timestamp': new Date().toISOString()
    });
  });

  // 在popup关闭时移除监听器
  const closeButton = popup.querySelector('.close-button');
  if (closeButton) {
    const originalClickHandler = closeButton.onclick;
    closeButton.onclick = () => {
      removeThemeListener();
      if (originalClickHandler) {
        originalClickHandler();
      }
    };
  }

  stylePopup(popup, rect);
  const aiResponseElement = document.createElement("div");
  const aiResponseContainer = document.createElement("div");
  styleResponseContainer(aiResponseContainer);

  aiResponseElement.id = "ai-response";
  aiResponseElement.style.padding = "10px 40px 0";
  aiResponseElement.style.fontSize = "14px";

  // 只在不隐藏问题时添加问题元素
  if (!hideQuestion) {
    const initialQuestionElement = document.createElement("div");
    initialQuestionElement.className = "user-question";
    initialQuestionElement.textContent = text;
    addCopyIcon(initialQuestionElement);
    aiResponseElement.appendChild(initialQuestionElement);
  }

  // 添加初始的 AI 回答
  const initialAnswerElement = document.createElement("div");
  initialAnswerElement.className = "ai-answer";
  initialAnswerElement.textContent = "AI正在思考...";
  aiResponseElement.appendChild(initialAnswerElement);
  addCopyIcon(initialAnswerElement);
  addRefreshIcon(initialAnswerElement, aiResponseElement);
  aiResponseContainer.style.paddingBottom = "10px";
  const iconContainer = document.createElement("div");
  iconContainer.className = "icon-wrapper";
  Object.assign(iconContainer.style, {
    gap: "10px",
    position: "absolute",
    display: "none",
    bottom: "5px",
    right:"5px"
  });
  const copyIcon = createSvgIcon("copy", "复制");
  const refreshIcon = createSvgIcon("redo", "重答");

  copyIcon.addEventListener("click", () => {
    const aiResponse = document.getElementById("ai-response");
    const tempElement = document.createElement("div");
    tempElement.innerHTML = aiResponse.innerHTML;
    const iconContainer = tempElement.querySelector(".icon-wrapper");
    if (iconContainer) {
      iconContainer.remove();
    }

    const textToCopy = tempElement.innerText;
    navigator.clipboard.writeText(textToCopy);
  });

  iconContainer.appendChild(copyIcon);
  iconContainer.appendChild(refreshIcon);

  aiResponseContainer.appendChild(aiResponseElement);
  aiResponseElement.addEventListener("mouseenter", () => {
    if (iconContainer.dataset.ready === "true") {
      iconContainer.style.display = "flex";
    }
  });

  aiResponseElement.addEventListener("mouseleave", () => {
    if (iconContainer.dataset.ready === "true") {
      iconContainer.style.display = "none";
    }
  });

  popup.appendChild(aiResponseContainer);
  const ps = new PerfectScrollbar(aiResponseContainer, {
    suppressScrollX: true,
    wheelPropagation: false,
  });

  document.body.appendChild(popup);

  let abortController = new AbortController();
  getAIResponse(
    text,
    initialAnswerElement,
    abortController.signal,
    ps,
    iconContainer,
    aiResponseContainer
  );

  function addCopyIcon(element) {
    const copyIcon = document.createElement("img");
    copyIcon.src = chrome.runtime.getURL("icons/copy.svg");
    copyIcon.style.position = "absolute";
    copyIcon.style.top = "5px";
    copyIcon.style.right = "5px";
    copyIcon.style.width = "15px";
    copyIcon.style.height = "15px";
    copyIcon.style.cursor = "pointer";
    copyIcon.style.display = "none"; // 初始隐藏图标

    // 鼠标悬停时显示复制图标
    element.addEventListener("mouseenter", () => {
      copyIcon.style.display = "block";
    });
    element.addEventListener("mouseleave", () => {
      copyIcon.style.display = "none";
    });

    // 点击复制图标时复制内容
    copyIcon.addEventListener("click", () => {
      const textToCopy = element.textContent;
      navigator.clipboard.writeText(textToCopy);
    });

    element.style.position = "relative"; // 使图标在元素内绝对定位
    element.appendChild(copyIcon);
  }
  function addRefreshIcon(answerElement, aiResponseElement) {
    const refreshIcon = document.createElement("img");
    refreshIcon.src = chrome.runtime.getURL("icons/redo.svg");
    refreshIcon.style.position = "absolute";
    refreshIcon.style.top = "5px";
    refreshIcon.style.right = "25px"; // 和复制图标保持距离
    refreshIcon.style.width = "15px";
    refreshIcon.style.height = "15px";
    refreshIcon.style.cursor = "pointer";
    refreshIcon.style.display = "none"; // 初始隐藏图标

    // 只有在最后一个 ai-answer 区域显示重答图标
    answerElement.addEventListener("mouseenter", () => {
      refreshIcon.style.display = "block";
    });
    answerElement.addEventListener("mouseleave", () => {
      refreshIcon.style.display = "none";
    });

    // 点击重答图标时执行重答逻辑
    refreshIcon.addEventListener("click", () => {
      const lastUserQuestion = aiResponseElement.querySelector(
        ".user-question:last-child"
      );
      if (lastUserQuestion) {
        const questionText = lastUserQuestion.textContent;
        answerElement.textContent = "AI正在思考...";
        getAIResponse(
          questionText,
          answerElement,
          new AbortController().signal,
          null,
          null,
          true
        );
      }
    });

    answerElement.style.position = "relative"; // 使图标在元素内绝对定位
    answerElement.appendChild(refreshIcon);
  }
  refreshIcon.addEventListener("click", (event) => {
    event.stopPropagation();
    abortController.abort();
    abortController = new AbortController();

    const aiAnswers = aiResponseElement.getElementsByClassName("ai-answer");
    const lastAiAnswer = aiAnswers[aiAnswers.length - 1];
    let userQuestion = lastAiAnswer.previousElementSibling;
    while (userQuestion && !userQuestion.classList.contains("user-question")) {
      userQuestion = userQuestion.previousElementSibling;
    }

    if (userQuestion && lastAiAnswer) {
      const questionText = userQuestion.textContent;
      lastAiAnswer.textContent = "AI正在思考...";
      getAIResponse(
        questionText,
        lastAiAnswer,
        abortController.signal,
        ps,
        iconContainer,
        aiResponseContainer,
        true
      );
    }
  });

  aiResponseContainer.addEventListener("wheel", () => {
    setAllowAutoScroll(false);
    updateAllowAutoScroll(aiResponseContainer);
  });

  const dragHandle = createDragHandle();
  popup.appendChild(dragHandle);

  interact(dragHandle).draggable({
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({ restriction: "body", endOnly: true }),
    ],
    listeners: { move: dragMoveListener },
  });

  interact(popup)
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 100, height: 100 },
          max: { width: 900, height: 700 },
        }),
      ],
      listeners: { move: resizeMoveListener },
      inertia: true,
      preventPropagation: true
    });

  const questionInputContainer = createQuestionInputContainer(aiResponseContainer);
  popup.appendChild(questionInputContainer);
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
    </div>
  `;

  const textarea = container.querySelector(".expandable-textarea");
  const sendIcon = container.querySelector(".send-icon");
  const ps = new PerfectScrollbar(textarea, {
    suppressScrollX: true,
    wheelPropagation: false,
  });
  textarea.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  textarea.addEventListener("focus", function () {
    this.style.minHeight = "60px";
  });

  textarea.addEventListener("blur", function () {
    if (this.value.trim() === "") {
      this.style.height = "40px";
      this.style.minHeight = "40px";
    }
  });

  function sendQuestion() {
    // 如果正在生成回答，则不允许发送
    if (getIsGenerating()) {
      return;
    }

    const question = textarea.value.trim();
    if (question) {
      sendQuestionToAI(question);
      textarea.value = "";
      textarea.style.height = "40px";
      textarea.style.minHeight = "40px";
    }
  }

  function updateSendButtonState() {
    const sendIcon = container.querySelector(".send-icon");
    const textarea = container.querySelector(".expandable-textarea");

    if (getIsGenerating()) {
      sendIcon.style.opacity = "0.5";
      sendIcon.style.cursor = "not-allowed";
      textarea.style.cursor = "not-allowed";
      textarea.setAttribute("disabled", "disabled");
      textarea.setAttribute("placeholder", "AI正在回答中...");
    } else {
      sendIcon.style.opacity = "1";
      sendIcon.style.cursor = "pointer";
      textarea.style.cursor = "text";
      textarea.removeAttribute("disabled");
      textarea.setAttribute("placeholder", "输入您的问题...");
    }
  }

  // 添加状态检查的定时器
  setInterval(updateSendButtonState, 100);

  textarea.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!getIsGenerating()) {
        sendQuestion();
      }
    }
  });

  sendIcon.addEventListener("click", function() {
    if (!getIsGenerating()) {
      sendQuestion();
    }
  });

  return container;
}

function sendQuestionToAI(question) {
  const aiResponseElement = document.getElementById("ai-response");
  const aiResponseContainer = document.getElementById("ai-response-container");
  const iconContainer = document.querySelector(".icon-wrapper");
  const ps = new PerfectScrollbar(aiResponseContainer, {
    suppressScrollX: true,
    wheelPropagation: false,
  });

  const questionElement = document.createElement("div");
  questionElement.className = "user-question";
  questionElement.textContent = `${question}`;
  aiResponseElement.appendChild(questionElement);

  const answerElement = document.createElement("div");
  answerElement.className = "ai-answer";
  answerElement.textContent = "AI正在思考...";
  aiResponseElement.appendChild(answerElement);

  aiResponseContainer.scrollTop = aiResponseContainer.scrollHeight;

  let abortController = new AbortController();
  getAIResponse(
    question,
    answerElement,
    abortController.signal,
    ps,
    iconContainer,
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
    backgroundColor: "#f6f6f6a8",
    boxShadow: "0 0 1px #0009, 0 0 2px #0000000d, 0 38px 90px #00000040",
    backdropFilter: "blur(10px)",
    borderRadius: "12px",
    zIndex: "1000",
    fontFamily: "Arial, sans-serif",
    overflow: "hidden",
    userSelect: "none",
    "-webkit-user-select": "none",
    "-moz-user-select": "none",
    "-ms-user-select": "none",
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

    // 只在选择文本时启用自动滚动
    if (window.getSelection().toString()) {
      const popupRect = popup.getBoundingClientRect();
      const mouseY = e.clientY;
      const relativeY = mouseY - popupRect.top;

      // 清除之前的滚动间隔
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }

      // 检查鼠标是否在弹窗的上边缘或下边缘
      if (relativeY < scrollThreshold) {
        // 向上滚动
        autoScrollInterval = setInterval(() => {
          responseContainer.scrollTop -= scrollSpeed;
        }, 16);
      } else if (relativeY > popup.offsetHeight - scrollThreshold) {
        // 向下滚动
        autoScrollInterval = setInterval(() => {
          responseContainer.scrollTop += scrollSpeed;
        }, 16);
      }
    }
  });

  // 当鼠标离开弹窗或松开鼠标时停止滚动
  popup.addEventListener('mouseleave', () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  });

  document.addEventListener('mouseup', () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  });
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

  .theme-adaptive.dark-mode .ai-answer pre {
    background-color: #282c34;
    border: 1px solid #3d3d3d;
  }

  .input-container {
    position: relative;
    width: calc(100% - 20px);
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .expandable-textarea {
    width: calc(100% - 65px);
    height: 40px;
    min-height: 40px;
    max-height: 80px;
    padding: 10px 40px 10px 10px;
    border-radius: 10px;
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
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.3s ease;
    color: #0A84FF;
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
  }

  .theme-adaptive.light-mode .ps__thumb-y {
    background-color: rgba(0, 0, 0, 0.2) !important;
  }

  .theme-adaptive.dark-mode .ps__thumb-y {
    background-color: rgba(255, 255, 255, 0.2) !important;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
