import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";
import mathjax3 from "markdown-it-mathjax3";

// 创建 MarkdownIt 实例
export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang }).value;
        return `<div class="code-wrap">${highlighted}</div>`;
      } catch (__) {}
    }
    return `<div class="code-wrap">${md.utils.escapeHtml(str)}</div>`;
  }
});

// 配置 mathjax3 插件
const mathjaxOptions = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true,
    packages: ['base', 'ams', 'noerrors', 'noundefined']
  },
  options: {
    skipHtmlTags: [],  // 不跳过任何HTML标签
    processHtmlClass: 'math-tex',
    ignoreHtmlClass: 'no-mathjax'  // 只有带有这个类的元素才会被忽略
  }
};

// 创建一个自定义的 markdown-it 规则来处理方括号数学公式
md.inline.ruler.before('escape', 'brackets_math', function(state, silent) {
  let pos = state.pos;
  let ch = state.src.charAt(pos);

  if (ch !== '[') return false;

  let content = '';
  let found = false;
  let start = pos;
  pos++;

  while (pos < state.src.length) {
    ch = state.src.charAt(pos);
    if (ch === ']') {
      found = true;
      break;
    }
    content += ch;
    pos++;
  }

  if (!found || content.length === 0) return false;

  if (!silent) {
    let token = state.push('math_inline', 'math', 0);
    token.content = content;
    token.markup = '[';
  }

  state.pos = pos + 1;
  return true;
});

// 添加渲染规则
md.renderer.rules.math_inline = function(tokens, idx) {
  return '\\(' + tokens[idx].content + '\\)';
};

// 使用 mathjax3 插件
md.use(mathjax3, mathjaxOptions);

// 保存原始的 fence 渲染器
const defaultFence = md.renderer.rules.fence;

// 修改 fence 渲染器
md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const code = token.content.trim();
  const lang = token.info.trim(); // 获取语言

  // 使用默认渲染器生成基础 HTML
  const rawHtml = defaultFence(tokens, idx, options, env, self);

  // 包装生成的 HTML，添加自动换行的样式类
  const wrappedHtml = `
    <div class="code-block-wrapper">
      <pre class="code-wrap">${rawHtml}</pre>
      <button class="copy-button">
        <img src="${chrome.runtime.getURL("icons/copy.svg")}" alt="Copy" />
      </button>
    </div>
  `;

  // 在下一个事件循环中初始化复制按钮
  requestAnimationFrame(() => {
    const codeBlocks = document.querySelectorAll(".code-block-wrapper");
    codeBlocks.forEach((block) => {
      const pre = block.querySelector("pre");
      const code = block.querySelector("code");

      // 确保代码高亮
      if (lang && hljs.getLanguage(lang)) {
        try {
          const result = hljs.highlight(code.textContent, { language: lang });
          code.innerHTML = result.value;
          code.classList.add('hljs', 'code-wrap');
        } catch (e) {
          console.warn('Failed to highlight:', e);
        }
      }

      // 设置复制按钮事件
      const copyButton = block.querySelector(".copy-button");
      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(code.textContent).then(() => {
          requestAnimationFrame(() => {
            copyButton.querySelector("img").src = chrome.runtime.getURL(
              "icons/copy.svg"
            );
          });
        });
      }, { passive: true });
    });
  });

  return wrappedHtml;
};

// 创建一个 Map 来存储每个代码块的 PerfectScrollbar 实例
const scrollbars = new Map();
