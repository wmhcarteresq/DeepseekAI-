import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import mathjax3 from "markdown-it-mathjax3";

// 用于收集所有需要处理的文本
let pendingTexts = [];

// 预处理数学公式
function preprocessMath(text) {
  // 辅助函数：检查括号是否匹配
  function checkBrackets(str) {
    const stack = [];
    const brackets = { '{': '}', '[': ']', '(': ')' };
    for (let char of str) {
      if ('{(['.includes(char)) {
        stack.push(char);
      } else if ('})]'.includes(char)) {
        if (stack.length === 0) return false;
        const last = stack.pop();
        if (brackets[last] !== char) return false;
      }
    }
    return stack.length === 0;
  }

  // 预处理：清理多余的空行和空格
  text = text.replace(/\n{3,}/g, '\n\n')
             .replace(/[ \t]+$/gm, '');

  // 处理块级公式 \[...\]
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, p1) => {
    p1 = p1.trim().replace(/\n\s+/g, '\n');
    return `\n$$${p1}$$\n`;
  });

  // 处理行内公式 \(...\)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, p1) => `$${p1.trim()}$`);

  // 处理数字的上下标
  text = text.replace(/(\d+)([_^])(\d+)(?!\})/g, '$1$2{$3}');
  text = text.replace(/([a-zA-Z])_(\d+)(?!\})/g, '$1_{$2}');

  // 处理行内公式
  text = text.replace(/\$([^$]+?)\$/g, (match, p1) => {
    // 处理括号不匹配的情况
    if (!checkBrackets(p1)) {
      p1 = p1.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '\\frac{$1}{$2}');
      p1 = p1.replace(/\\sqrt\{([^{}]+)\}/g, '\\sqrt{$1}');
    }

    // 处理特殊字符和空格
    p1 = p1.replace(/\\(pm|mp|times|div|gamma|ln|int|infty|leq|geq|neq|approx)\b/g, '\\$1 ');

    // 处理分数
    p1 = p1.replace(/\\frac([^{])/g, '\\frac{$1}');

    // 处理上下标
    p1 = p1.replace(/([_^])([^{])/g, '$1{$2}');

    return `$${p1.trim()}$`;
  });

  // 处理块级公式
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, p1) => {
    // 清理公式内部的格式
    p1 = p1.trim()
           .replace(/\n\s+/g, '\n')
           .replace(/\\(gamma|ln)\b/g, '\\$1 ');

    // 确保公式前后有适当的空行
    return `\n$$${p1}$$\n`;
  });

  // 处理特殊符号
  const specialChars = {
    '∫': '\\int ',
    '±': '\\pm ',
    '∓': '\\mp ',
    '×': '\\times ',
    '÷': '\\div ',
    '∞': '\\infty ',
    '≤': '\\leq ',
    '≥': '\\geq ',
    '≠': '\\neq ',
    '≈': '\\approx '
  };

  // 修复 \infty 的错误处理
  text = text.replace(/\\?\}infty/g, '\\infty')
             .replace(/\{\}infty/g, '\\infty');

  for (const [char, replacement] of Object.entries(specialChars)) {
    text = text.replace(new RegExp(char, 'g'), replacement);
  }

  // 最终清理：规范化空行和列表格式
  return text.replace(/\n{3,}/g, '\n\n')
             .replace(/(\d+\.)\s+(\*\*[^*]+\*\*：)\s*\n+\s*\n+(\$\$)/g, '$1 $2\n$3');
}

// 创建 MarkdownIt 实例
const md = new MarkdownIt({
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
    packages: ['base', 'ams', 'noerrors', 'noundefined']
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  },
  chtml: {
    scale: 1,
    minScale: .5,
    mtextInheritFont: true,
    merrorInheritFont: true
  }
};

// 使用 mathjax3 插件
md.use(mathjax3, mathjaxOptions);

// 重写 render 方法，添加错误处理
const originalRender = md.render.bind(md);
md.render = function(text) {
  try {
    const preprocessedText = preprocessMath(text);
    // 收集文本而不是立即输出
    pendingTexts.push({
      original: text,
      processed: preprocessedText
    });

    // 确保公式被正确处理
    const result = originalRender(preprocessedText)
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, p1) => `<div class="math-block">$$${p1}$$</div>`)
      .replace(/\$([^$]+?)\$/g, (_, p1) => `<span class="math-inline">$${p1}$</span>`);

    // AI响应完成后，一次性输出所有收集的文本
    setTimeout(() => {
      if (pendingTexts.length > 0) {
        pendingTexts.forEach((item, index) => {
        });
        pendingTexts = []; // 清空收集的文本
      }
    }, 0);

    return result;
  } catch (error) {
    console.error('渲染错误:', error);
    return originalRender(text);
  }
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

export { md };