import { getAllowAutoScroll, scrollToBottom } from "../utils/scrollManager";
import { md } from "../utils/markdownRenderer";

let conversation = [];
let isGenerating = false;
let renderQueue = [];
let isProcessingQueue = false;

// 使用 Performance API 优化性能监控
const performance = window.performance;

export function getIsGenerating() {
  return isGenerating;
}

// 使用防抖优化文本处理
const processTextDebounced = (() => {
  let timeout;
  return (text, type, callback) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      const result = processText(text, type);
      callback(result);
    }, 100);
  };
})();

function processText(text, type) {
  if (type === 'cleanup') {
    return text.trim().replace(/\s+/g, ' ');
  }
  return text;
}

// 优化渲染队列处理
async function processRenderQueue(responseElement, ps, aiResponseContainer) {
  if (isProcessingQueue || renderQueue.length === 0) return;

  isProcessingQueue = true;
  const startTime = performance.now();

  while (renderQueue.length > 0) {
    const currentChunk = renderQueue.shift();

    try {
      const renderedContent = await md.render(currentChunk);

      if (responseElement && !responseElement.isConnected) {
        console.warn('Response element was removed from DOM');
        break;
      }

      // 使用 DocumentFragment 优化 DOM 操作
      const fragment = document.createDocumentFragment();
      const temp = document.createElement('div');
      temp.innerHTML = renderedContent;

      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }

      // 保存原有的图标容器
      const iconContainer = responseElement.querySelector('.icon-container');

      // 清空内容并添加新内容
      responseElement.textContent = '';
      responseElement.appendChild(fragment);

      // 恢复图标容器
      if (iconContainer) {
        responseElement.appendChild(iconContainer);
      }

      // 性能优化：使用 requestAnimationFrame 处理滚动
      if (getAllowAutoScroll()) {
        requestAnimationFrame(() => {
          scrollToBottom(aiResponseContainer);
        });
      }

      // 更新自定义滚动条
      if (ps) {
        requestAnimationFrame(() => {
          ps.update();
        });
      }

      // 性能监控：如果处理时间过长，让出主线程
      if (performance.now() - startTime > 16) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } catch (error) {
      console.error('Error processing render queue:', error);
    }
  }

  isProcessingQueue = false;
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
  renderQueue = [];

  const existingIconContainer = responseElement.querySelector('.icon-container');
  const originalClassName = responseElement.className;

  responseElement.textContent = "";
  if (existingIconContainer) {
    responseElement.appendChild(existingIconContainer);
  }

  responseElement.className = originalClassName;

  try {
    const [{ apiKey, language }, { model }] = await Promise.all([
      new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "getApiKeyAndLanguage" }, resolve);
      }),
      new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "getModel" }, resolve);
      })
    ]);

    if (!apiKey) {
      const linkElement = document.createElement("a");
      linkElement.href = "#";
      linkElement.textContent = "Please first set your API key in extension popup.";
      linkElement.style.color = "#0066cc";
      linkElement.style.textDecoration = "underline";
      linkElement.style.cursor = "pointer";
      linkElement.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await chrome.runtime.sendMessage({ action: "openPopup" });
        } catch (error) {
          console.error('Failed to open popup:', error);
          // 如果发送消息失败，尝试使用备用方法
          chrome.runtime.sendMessage({ action: "getSelectedText" });
        }
      });

      responseElement.textContent = "";
      responseElement.appendChild(linkElement);
      if (existingIconContainer) {
        responseElement.appendChild(existingIconContainer);
      }
      return;
    }

    if (isRefresh) {
      conversation = conversation.slice(0, -1);
    } else {
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
    let lastProcessTime = performance.now();

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
              if (data.choices?.[0]?.delta?.content) {
                aiResponse += data.choices[0].delta.content;
                renderQueue.push(aiResponse);

                // 性能优化：控制渲染频率
                const currentTime = performance.now();
                if (currentTime - lastProcessTime > 32) {
                  await processRenderQueue(responseElement, ps, aiResponseContainer);
                  lastProcessTime = currentTime;
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

    // 确保处理完所有剩余的渲染队列
    await processRenderQueue(responseElement, ps, aiResponseContainer);
    conversation.push({ role: "assistant", content: aiResponse });

    // 使用 requestIdleCallback 优化图标更新
    requestIdleCallback(() => {
      if (window.addIconsToElement) {
        window.addIconsToElement(responseElement);
      }
      if (window.updateLastAnswerIcons) {
        window.updateLastAnswerIcons();
      }
    }, { timeout: 1000 });

    // 优化按钮显示逻辑
    if (iconContainer) {
      iconContainer.style.display = 'flex';
      iconContainer.dataset.initialShow = 'true';

      // 使用 IntersectionObserver 优化按钮位置调整
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const buttonContainer = responseElement.querySelector('.icon-container');
            if (buttonContainer && aiResponseContainer) {
              const buttonRect = buttonContainer.getBoundingClientRect();
              const containerRect = aiResponseContainer.getBoundingClientRect();
              const buttonBottom = buttonRect.bottom - containerRect.top;

              if (buttonBottom > aiResponseContainer.clientHeight) {
                const extraScroll = buttonBottom - aiResponseContainer.clientHeight + 40;
                aiResponseContainer.scrollTop += extraScroll;
                if (ps) ps.update();
              }
            }
            observer.disconnect();
          }
        });
      });

      observer.observe(iconContainer);
    }

    if (onComplete) {
      requestIdleCallback(() => onComplete(), { timeout: 1000 });
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