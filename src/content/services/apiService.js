import { getAllowAutoScroll, scrollToBottom } from "../utils/scrollManager";
import { md } from "../utils/markdownRenderer";

// 全局变量用于存储对话历史
let messages = [];
let isGenerating = false;
let renderQueue = [];
let isProcessingQueue = false;

// 用于存储当前响应的内容
let currentReasoningContent = "";
let currentContent = "";

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

  try {
    while (renderQueue.length > 0) {
      // 检查元素是否仍然存在于 DOM 中
      if (!responseElement || !responseElement.isConnected || !aiResponseContainer || !aiResponseContainer.isConnected) {
        console.log('Response element or container was removed from DOM, clearing render queue');
        renderQueue = [];
        break;
      }

      const currentChunk = renderQueue.shift();

      try {
        // 分别渲染思维链和最终答案
        if (currentChunk.reasoningContent) {
          let reasoningContentElement = responseElement.querySelector('.reasoning-content');

          if (!reasoningContentElement) {
            // 如果不存在，创建新的reasoning content结构
            reasoningContentElement = document.createElement('div');
            reasoningContentElement.className = 'reasoning-content expanded';
            reasoningContentElement.innerHTML = `
              <div class="reasoning-header">
                <div class="reasoning-toggle"></div>
                <span>Reasoning process</span>
              </div>
              <div class="reasoning-content-inner"></div>
            `;
            responseElement.insertBefore(reasoningContentElement, responseElement.firstChild);
          }

          // 只更新内容部分
          const reasoningInner = reasoningContentElement.querySelector('.reasoning-content-inner');
          if (reasoningInner) {
            const reasoningHtml = await md.render(currentChunk.reasoningContent);
            reasoningInner.innerHTML = reasoningHtml;
          }
        }

        if (currentChunk.content) {
          // 查找或创建内容容器
          let contentElement = responseElement.querySelector('.content-container');
          if (!contentElement) {
            contentElement = document.createElement('div');
            contentElement.className = 'content-container';
            responseElement.appendChild(contentElement);
          }

          const contentHtml = await md.render(currentChunk.content);
          contentElement.innerHTML = contentHtml;
        }

        // 性能优化：使用 requestAnimationFrame 处理滚动
        if (getAllowAutoScroll() && aiResponseContainer.isConnected) {
          requestAnimationFrame(() => {
            scrollToBottom(aiResponseContainer);
          });
        }

        // 更新自定义滚动条
        if (ps && aiResponseContainer.isConnected) {
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
        break;
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

// 验证和清理消息历史
function validateAndCleanMessages() {
  // 如果发现连续的user消息，删除前一条
  for (let i = messages.length - 1; i > 0; i--) {
    if (messages[i].role === 'user' && messages[i-1].role === 'user') {
      messages.splice(i-1, 1);
    }
  }
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
  if (!text) return;

  isGenerating = true;
  window.currentAbortController = signal?.controller || new AbortController();
  renderQueue = [];

  // 处理消息历史
  if (isRefresh) {
    // 如果是刷新,只移除最后一条助手的回答,保留用户的问题
    messages = messages.slice(0, -1);
  }

  // 在添加新消息前验证和清理历史消息
  validateAndCleanMessages();

  // 添加用户的新消息
  if (!isRefresh) {
    messages.push({ role: "user", content: text });
  }

  // 再次验证确保消息历史正确
  validateAndCleanMessages();

  const existingIconContainer = responseElement.querySelector('.icon-container');
  const originalClassName = responseElement.className;

  responseElement.textContent = "";
  if (existingIconContainer) {
    responseElement.appendChild(existingIconContainer);
  }

  responseElement.className = originalClassName;

  // 在函数结束时确保清理
  const cleanup = () => {
    isGenerating = false;
    window.currentAbortController = null;
    renderQueue = [];  // 清空渲染队列
    if (ps && ps.element && ps.element.isConnected) {
      ps.update();
    }
  };

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

    const requestBody = {
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
        ...messages // 使用完整的消息历史
      ],
      stream: true,
      temperature: 0.5,
    };

    // 添加日志
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: window.currentAbortController.signal,
    });

    if (!response.ok) {
      handleError(response.status, responseElement);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiResponse = "";
    let reasoningContent = "";
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

              // 处理思维链内容（仅对R1模型）
              if (model === "r1" && data.choices?.[0]?.delta?.reasoning_content) {
                reasoningContent += data.choices[0].delta.reasoning_content;
                currentReasoningContent = reasoningContent;
              }

              // 处理最终答案内容
              if (data.choices?.[0]?.delta?.content) {
                aiResponse += data.choices[0].delta.content;
                currentContent = aiResponse;
              }

              // 将两种内容都加入渲染队列
              renderQueue.push({
                reasoningContent: model === "r1" ? reasoningContent : "",
                content: aiResponse
              });

              // 性能优化：控制渲染频率
              const currentTime = performance.now();
              if (currentTime - lastProcessTime > 32) {
                await processRenderQueue(responseElement, ps, aiResponseContainer);
                lastProcessTime = currentTime;
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

    // 更新消息历史（只保存最终答案，不保存思维链）
    if (currentContent) {
      messages.push({ role: "assistant", content: currentContent });
      // 打印当前消息历史,用于调试
      console.log('Current messages history:', JSON.stringify(messages, null, 2));
    }

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
    cleanup();
  }
}

function handleError(status, responseElement) {
  const errorMessages = {
    400: "Request body format error, please check and modify.",
    401: "API key error, authentication failed.",
    402: "Insufficient account balance, please recharge.",
    422: "Request body parameter error, please check and modify.",
    429: "Request rate limit reached, please try again later.",
    500: "Internal server error, please try again later.",
    503: "Server overload, please try again later."
  };
  const textNode = document.createTextNode(errorMessages[status] || "请求失败，请稍后重试。");
  responseElement.textContent = "";
  responseElement.appendChild(textNode);
}