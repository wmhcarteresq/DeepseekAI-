import { getIsGenerating } from '../services/apiService';
import { getAIResponse } from '../services/apiService';
import { addIconsToElement } from './IconManager';

export const createQuestionInputContainer = (aiResponseContainer) => {
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

  setupTextarea(textarea);
  setupSendButton(sendIcon, textarea, aiResponseContainer);
  setupLoadingIcon(loadingIconWrapper);
  setupUpdateButtonState(container);

  return container;
};

const setupTextarea = (textarea) => {
  const textareaState = new WeakMap();

  const initTextareaState = (element) => ({
    isComposing: false,
    lastHeight: 40,
    compositionText: '',
    originalValue: '',
    lock: false
  });

  const getState = (element) => {
    return textareaState.get(element) || initTextareaState(element);
  };

  const updateHasContent = (element) => {
    if (element.value.trim()) {
      element.classList.add('has-content');
    } else {
      element.classList.remove('has-content');
    }
  };

  const performHeightUpdate = (element) => {
    const state = getState(element);
    if (state.lock) return;

    const valueToCheck = state.isComposing
      ? element.value + state.compositionText
      : element.value;

    updateHasContent(element);

    if (!valueToCheck.trim()) {
      element.style.height = "44px";
      return;
    }

    const selectionStart = element.selectionStart;
    const selectionEnd = element.selectionEnd;
    const scrollTop = element.scrollTop;

    const lines = valueToCheck.split('\n');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = getComputedStyle(element).font;

    const containerWidth = element.clientWidth - 32;
    let needsExpand = false;

    for (const line of lines) {
      const metrics = context.measureText(line);
      if (metrics.width > containerWidth) {
        needsExpand = true;
        break;
      }
    }

    if (lines.length > 1 || needsExpand) {
      element.style.height = 'auto';
      const newHeight = Math.min(Math.max(element.scrollHeight, 44), 120);
      element.style.height = `${newHeight}px`;
      element.scrollTop = scrollTop;
      element.setSelectionRange(selectionStart, selectionEnd);
    } else {
      element.style.height = "44px";
    }
  };

  const handleComposition = (event) => {
    const state = getState(event.target);
    switch (event.type) {
      case 'compositionstart':
        state.isComposing = true;
        state.compositionText = event.data || '';
        state.lock = true;
        break;
      case 'compositionupdate':
        state.compositionText = event.data || '';
        break;
      case 'compositionend':
        state.isComposing = false;
        state.compositionText = '';
        state.lock = false;
        requestAnimationFrame(() => {
          performHeightUpdate(event.target);
        });
        break;
    }
  };

  textarea.addEventListener("compositionstart", handleComposition, { passive: true });
  textarea.addEventListener("compositionupdate", handleComposition, { passive: true });
  textarea.addEventListener("compositionend", handleComposition, { passive: true });

  textarea.addEventListener("input", (event) => {
    const state = getState(event.target);
    if (!state.isComposing) {
      requestAnimationFrame(() => {
        performHeightUpdate(event.target);
      });
    }
    updateHasContent(event.target);
  }, { passive: true });

  textarea.addEventListener("keydown", (event) => {
    const state = getState(event.target);
    if (event.key === "Enter") {
      if (!event.shiftKey && !state.isComposing) {
        event.preventDefault();
        if (!getIsGenerating()) {
          sendQuestion(textarea, aiResponseContainer);
        }
      } else {
        requestAnimationFrame(() => {
          performHeightUpdate(event.target);
        });
      }
    }
  });

  textarea.style.height = "44px";
  textarea.style.minHeight = "44px";
  textarea.style.maxHeight = "120px";
};

const setupSendButton = (sendIcon, textarea, aiResponseContainer) => {
  sendIcon.addEventListener("click", () => {
    if (!getIsGenerating()) {
      sendQuestion(textarea, aiResponseContainer);
    }
  });
};

const setupLoadingIcon = (loadingIconWrapper) => {
  loadingIconWrapper.addEventListener("click", () => {
    if (getIsGenerating() && window.currentAbortController) {
      window.currentAbortController.abort();
    }
  });
};

const setupUpdateButtonState = (container) => {
  const updateSendButtonState = () => {
    const sendIcon = container.querySelector(".send-icon");
    const loadingIconWrapper = container.querySelector(".loading-icon-wrapper");
    const loadingIcon = container.querySelector(".loading-icon");
    const textarea = container.querySelector(".expandable-textarea");

    if (getIsGenerating()) {
      sendIcon.style.display = "none";
      loadingIconWrapper.style.display = "block";
      loadingIcon.classList.add("active");
      textarea.style.cursor = "not-allowed";
      textarea.setAttribute("disabled", "disabled");
      textarea.setAttribute("placeholder", "AI正在回答中...");
    } else {
      sendIcon.style.display = "block";
      loadingIconWrapper.style.display = "none";
      loadingIcon.classList.remove("active");
      textarea.style.cursor = "text";
      textarea.removeAttribute("disabled");
      textarea.setAttribute("placeholder", "输入您的问题...");
    }
  };

  setInterval(updateSendButtonState, 100);
};

const sendQuestion = (textarea, aiResponseContainer) => {
  const question = textarea.value.trim();
  if (question) {
    const aiResponseElement = document.getElementById("ai-response");

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

    textarea.value = "";
    textarea.style.height = "44px";
    textarea.style.minHeight = "44px";
  }
};