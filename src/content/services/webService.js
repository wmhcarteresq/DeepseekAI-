import { getAllowAutoScroll, scrollToBottom } from "../utils/scrollManager";
import { md } from "../utils/markdownRenderer";

let conversation = [];
let isGenerating = false;
let renderQueue = [];
let isProcessingQueue = false;

export async function checkDeepSeekLogin() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: ".deepseek.com" });
    return cookies.length > 0;
  } catch (error) {
    console.error('Failed to check DeepSeek login status:', error);
    return false;
  }
}

export async function getWebAIResponse(
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

  try {
    // 检查登录状态
    const isLoggedIn = await checkDeepSeekLogin();
    if (!isLoggedIn) {
      const linkElement = document.createElement("a");
      linkElement.href = "https://chat.deepseek.com/";
      linkElement.textContent = "请先登录 DeepSeek 官网";
      linkElement.target = "_blank";
      linkElement.style.color = "#0066cc";
      linkElement.style.textDecoration = "underline";
      responseElement.appendChild(linkElement);
      return;
    }

    if (isRefresh) {
      conversation = conversation.slice(0, -1);
    } else {
      conversation.push({ role: "user", content: text });
    }

    // 获取语言设置
    const { language } = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: "getApiKeyAndLanguage" }, resolve);
    });

    // 发送请求到官网接口
    const response = await fetch("https://chat.deepseek.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',  // 重要：包含 cookies
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant. ${
              language === "auto"
                ? "Detect and respond in the same language as the user's input."
                : `You MUST respond ONLY in ${language}.`
            }`,
          },
          ...conversation,
        ],
        stream: true,
        model: "deepseek-chat",
      }),
      signal: window.currentAbortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiResponse = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith("data: ")) {
            const jsonLine = line.slice(6);
            if (jsonLine === "[DONE]") break;

            try {
              const data = JSON.parse(jsonLine);
              if (data.choices?.[0]?.delta?.content) {
                aiResponse += data.choices[0].delta.content;
                renderQueue.push(aiResponse);

                // 渲染内容
                const renderedContent = await md.render(aiResponse);
                responseElement.innerHTML = renderedContent;

                if (existingIconContainer) {
                  responseElement.appendChild(existingIconContainer);
                }

                if (getAllowAutoScroll()) {
                  scrollToBottom(aiResponseContainer);
                }

                if (ps) ps.update();
              }
            } catch (e) {
              console.error("Error parsing JSON:", e);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        throw error;
      }
    }

    conversation.push({ role: "assistant", content: aiResponse });

    if (window.addIconsToElement) {
      window.addIconsToElement(responseElement);
    }
    if (window.updateLastAnswerIcons) {
      window.updateLastAnswerIcons();
    }

    if (onComplete) {
      onComplete();
    }

  } catch (error) {
    console.error("Error:", error);
    responseElement.textContent = error.message || "请求失败，请确保已登录 DeepSeek 官网并重试";
    if (existingIconContainer) {
      responseElement.appendChild(existingIconContainer);
    }
  } finally {
    isGenerating = false;
    window.currentAbortController = null;
    if (ps) ps.update();
  }
}

export function getIsGenerating() {
  return isGenerating;
}