import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";

// 创建 MarkdownIt 实例
export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return '';
  }
});

// 保存原始的 fence 渲染器
const defaultFence = md.renderer.rules.fence;

// 修改 fence 渲染器
md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const code = token.content.trim();
  const lang = token.info.trim(); // 获取语言

  // 使用默认渲染器生成基础 HTML
  const rawHtml = defaultFence(tokens, idx, options, env, self);

  // 包装生成的 HTML
  const wrappedHtml = `
    <div class="code-block-wrapper">
      ${rawHtml}
      <button class="copy-button">
        <img src="${chrome.runtime.getURL("icons/copy.svg")}" alt="Copy" />
      </button>
    </div>
  `;

  // 在下一个事件循环中初始化滚动条和复制按钮
  setTimeout(() => {
    const codeBlocks = document.querySelectorAll(".code-block-wrapper");
    codeBlocks.forEach((block) => {
      const pre = block.querySelector("pre");
      const code = block.querySelector("code");

      // 确保代码高亮
      if (lang && hljs.getLanguage(lang)) {
        try {
          const result = hljs.highlight(code.textContent, { language: lang });
          code.innerHTML = result.value;
          code.classList.add('hljs'); // 添加 hljs 类
        } catch (e) {
          console.warn('Failed to highlight:', e);
        }
      }

      // 初始化 PerfectScrollbar
      if (!scrollbars.has(pre)) {
        const ps = new PerfectScrollbar(pre, {
          suppressScrollY: false,
          wheelSpeed: 1,
          wheelPropagation: false,
          minScrollbarLength: 30,
          maxScrollbarLength: 150,
          swipeEasing: true,
          scrollXMarginOffset: 0,
          handlers: ['click-rail', 'drag-thumb', 'keyboard'],
        });
        scrollbars.set(pre, ps);

        // 强制更新滚动条
        setTimeout(() => ps.update(), 0);
      }

      // 设置复制按钮事件
      const copyButton = block.querySelector(".copy-button");
      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(code.textContent).then(() => {
          copyButton.querySelector("img").src = chrome.runtime.getURL(
            "icons/copyClicked.svg"
          );
          setTimeout(() => {
            copyButton.querySelector("img").src = chrome.runtime.getURL(
              "icons/copy.svg"
            );
          }, 2000);
        });
      });
    });
  }, 0);

  return wrappedHtml;
};

// 创建一个 Map 来存储每个代码块的 PerfectScrollbar 实例
const scrollbars = new Map();
