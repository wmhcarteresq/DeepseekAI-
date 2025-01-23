import { getAllowAutoScroll, scrollToBottom } from "../utils/scrollManager";
import { md } from "../utils/markdownRenderer";

let conversation = [];
let isGenerating = false;

export function getIsGenerating() {
  return isGenerating;
}

export async function getAIResponse(
  text,
  responseElement,
  signal,
  ps,
  iconContainer,
  aiResponseContainer,
  isRefresh = false,
  onComplete
) {
  isGenerating = true;
  window.currentAbortController = signal?.controller || new AbortController();

  const existingIconContainer = responseElement.querySelector('.icon-container');
  const originalClassName = responseElement.className;

  responseElement.textContent = "";
  if (existingIconContainer) {
    responseElement.appendChild(existingIconContainer);
  }

  responseElement.className = originalClassName;

  let allowAutoScroll = true;

  const { apiKey, language } = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getApiKeyAndLanguage" }, resolve);
  });

  const { model } = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getModel" }, resolve);
  });

  if (!apiKey) {
    const linkElement = document.createElement("a");
    linkElement.href = "#";
    linkElement.textContent = "Please first set your API key in extension popup.";
    linkElement.style.color = "#0066cc";
    linkElement.style.textDecoration = "underline";
    linkElement.style.cursor = "pointer";
    linkElement.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: "openPopup" });
    });

    responseElement.textContent = "";
    responseElement.appendChild(linkElement);
    if (existingIconContainer) {
      responseElement.appendChild(existingIconContainer);
    }
    return;
  }

  try {
    if(isRefresh){
      conversation = conversation.slice(0, -1);
    }else{
      conversation.push({ role: "user", content: text });
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model === "r1" ? "deepseek-reasoner" : "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant. ${
              language === "auto"
                ? "Detect and respond in the same language as the user's input. If the user's input is in Chinese, respond in Chinese. If the user's input is in English, respond in English, etc."
                : `You MUST respond ONLY in ${language}. This is a strict requirement. Do not use any other language except ${language}.`
            }`,
          },
          ...conversation,
        ],
        stream: true,
        temperature: 0.5,
      }),
      signal: window.currentAbortController.signal,
    });

    if (!response.ok) {
      handleError(response.status, responseElement);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiResponse = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonLine = line.slice(6);
            if (jsonLine === "[DONE]") break;

            try {
              const data = JSON.parse(jsonLine);
              if (
                data.choices &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                aiResponse += data.choices[0].delta.content;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = md.render(aiResponse);

                const codeBlocks = tempDiv.querySelectorAll('pre code');
                codeBlocks.forEach(codeBlock => {
                  codeBlock.classList.add('code-wrap');
                });

                const className = responseElement.className;
                const iconContainer = responseElement.querySelector('.icon-container');

                responseElement.textContent = "";
                while (tempDiv.firstChild) {
                  responseElement.appendChild(tempDiv.firstChild);
                }

                responseElement.className = className;
                if (iconContainer) {
                  responseElement.appendChild(iconContainer);
                }

                ps.update();
                if (getAllowAutoScroll()) {
                  scrollToBottom(aiResponseContainer);
                }
              }
            } catch (e) {
              console.error("Error parsing JSON:", e);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted, keeping generated content');
      } else {
        throw error;
      }
    }

    conversation.push({ role: "assistant", content: aiResponse });

    requestAnimationFrame(() => {
      if (window.addIconsToElement) {
        window.addIconsToElement(responseElement);
      }
      if (window.updateLastAnswerIcons) {
        window.updateLastAnswerIcons();
      }
    });

    // 先显示按钮
    if (iconContainer) {
      iconContainer.style.display = 'flex';
      iconContainer.dataset.initialShow = 'true';
    }

    // 使用 requestAnimationFrame 确保在按钮显示后再计算位置
    requestAnimationFrame(() => {
      // 确保按钮完全可见
      const container = aiResponseContainer;
      const buttonContainer = responseElement.querySelector('.icon-container');
      if (buttonContainer && container) {
        // 计算按钮底部位置
        const buttonRect = buttonContainer.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const buttonBottom = buttonRect.bottom - containerRect.top;

        // 如果按钮底部超出可视区域，调整滚动位置
        if (buttonBottom > container.clientHeight) {
          const extraScroll = buttonBottom - container.clientHeight + 40; // 增加到40px的空间
          container.scrollTop += extraScroll;
          if (ps) ps.update();
        }
      }
    });

    if (onComplete) {
      onComplete();
    }
  } catch (error) {
    console.error("Fetch error:", error);
    if (error.name !== 'AbortError') {
      const textNode = document.createTextNode("Request failed. Please try again later.");
      responseElement.textContent = "";
      responseElement.appendChild(textNode);
      if (existingIconContainer) {
        responseElement.appendChild(existingIconContainer);
      }
    }
  } finally {
    isGenerating = false;
    window.currentAbortController = null;
    if (ps) ps.update();
  }
}

function handleError(status, responseElement) {
  const errorMessages = {
    400: "请求体格式错误，请检查并修改。",
    401: "API key 错误，认证失败。",
    402: "账号余额不足，请充值。",
    422: "请求体参数错误，请检查并修改。",
    429: "请求速率达到上限，请稍后重试。",
    500: "服务器内部故障，请稍后重试。",
    503: "服务器负载过高，请稍后重试。",
  };
  const textNode = document.createTextNode(errorMessages[status] || "请求失败，请稍后重试。");
  responseElement.textContent = "";
  responseElement.appendChild(textNode);
}