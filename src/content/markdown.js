import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";
import mathjax3 from "markdown-it-mathjax3";

// 创建预处理函数
function preprocessMath(text) {
  // 替换块级公式 \[...\] 为 $$...$$
  text = text.replace(/\\?\[([^]*?)\\?\]/g, (match, p1) => {
    if (match.startsWith('\\[') && match.endsWith('\\]')) {
      return `$$${p1}$$`;
    }
    return match;
  });

  // 替换行内公式 \(...\) 为 $...$
  text = text.replace(/\\?\((.*?)\\?\)/g, (match, p1) => {
    if (match.startsWith('\\(') && match.endsWith('\\)')) {
      return `$${p1}$`;
    }
    return match;
  });

  return text;
}

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
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
    processEscapes: true,
    processEnvironments: true,
    packages: ['base', 'ams', 'noerrors', 'noundefined'],
    processRefs: true,
    processEscapes: true
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  },
  startup: {
    typeset: false,  // 禁用自动渲染
    ready: () => {
      MathJax.startup.defaultReady();
      MathJax.startup.promise.then(() => {
        // 设置渲染选项
        MathJax.config.options.renderActions = {
          addMenu: [],  // 禁用右键菜单
          checkLoading: [],  // 禁用加载检查
          find: [
            'find',  // 名称
            'find',  // 动作
            '(doc) => doc.findMath()',  // 函数
            true  // 延迟
          ],
          typeset: [
            'typeset',  // 名称
            'typeset',  // 动作
            '(math, doc) => math.typesetRoot = doc.typesetRoot',  // 函数
            false  // 不延迟
          ]
        };
      });
    }
  }
};

// 使用 mathjax3 插件
md.use(mathjax3, mathjaxOptions);

// 重写 render 方法
const originalRender = md.render.bind(md);
md.render = function(text) {
  const preprocessedText = preprocessMath(text);
  return originalRender(preprocessedText);
};

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
