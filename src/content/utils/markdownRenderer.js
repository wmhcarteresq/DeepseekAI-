import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import mathjax3 from "markdown-it-mathjax3";

// 使用 WeakMap 来缓存已处理过的数学公式
const mathCache = new WeakMap();
const processedTexts = new Map();

// 使用 Memoization 优化预处理数学公式
const memoizedPreprocessMath = (() => {
  const cache = new Map();
  return (text) => {
    if (cache.has(text)) {
      return cache.get(text);
    }
    const result = preprocessMath(text);
    cache.set(text, result);
    return result;
  };
})();

// 预处理数学公式
function preprocessMath(text) {
  // 使用正则表达式优化：减少重复处理
  const patterns = {
    brackets: /[{([})\]]/g,
    blockFormula: /\\\[([\s\S]*?)\\\]/g,
    inlineFormula: /\\\(([\s\S]*?)\\\)/g,
    subscripts: /(\d+|[a-zA-Z])([_^])(\d+)(?!\})/g,
    specialSymbols: /\\(pm|mp|times|div|gamma|ln|int|infty|leq|geq|neq|approx)\b/g,
  };

  // 优化括号匹配检查
  const checkBrackets = (str) => {
    const stack = [];
    const pairs = { '{': '}', '[': ']', '(': ')' };
    for (const char of str.match(patterns.brackets) || []) {
      if ('{(['.includes(char)) {
        stack.push(char);
      } else if (stack.length === 0 || pairs[stack.pop()] !== char) {
        return false;
      }
    }
    return stack.length === 0;
  };

  // 批量处理文本替换
  let processed = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '');

  // 优化块级公式处理
  processed = processed.replace(patterns.blockFormula, (_, p1) =>
    `\n$$${p1.trim().replace(/\n\s+/g, '\n')}$$\n`
  );

  // 优化行内公式处理
  processed = processed.replace(patterns.inlineFormula, (_, p1) =>
    `$${p1.trim()}$`
  );

  // 优化上下标处理
  processed = processed.replace(patterns.subscripts, '$1$2{$3}');

  // 使用 Map 优化特殊字符替换
  const specialChars = new Map([
    ['∫', '\\int '],
    ['±', '\\pm '],
    ['∓', '\\mp '],
    ['×', '\\times '],
    ['÷', '\\div '],
    ['∞', '\\infty '],
    ['≤', '\\leq '],
    ['≥', '\\geq '],
    ['≠', '\\neq '],
    ['≈', '\\approx ']
  ]);

  // 批量处理特殊字符
  for (const [char, replacement] of specialChars) {
    processed = processed.replaceAll(char, replacement);
  }

  return processed;
}

// 创建 MarkdownIt 实例并优化配置
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (!lang || !hljs.getLanguage(lang)) {
      return `<div class="code-wrap">${md.utils.escapeHtml(str)}</div>`;
    }
    try {
      return `<div class="code-wrap">${hljs.highlight(str, { language: lang }).value}</div>`;
    } catch {
      return `<div class="code-wrap">${md.utils.escapeHtml(str)}</div>`;
    }
  }
});

// 优化 mathjax 配置
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

md.use(mathjax3, mathjaxOptions);

// 优化渲染方法
const originalRender = md.render.bind(md);
md.render = function(text) {
  try {
    // 使用缓存的预处理结果
    const preprocessedText = memoizedPreprocessMath(text);

    if (processedTexts.has(preprocessedText)) {
      return processedTexts.get(preprocessedText);
    }

    // 使用 Promise 和 requestAnimationFrame 优化渲染时机
    const renderPromise = new Promise((resolve) => {
      requestAnimationFrame(() => {
        const result = originalRender(preprocessedText)
          .replace(/\$\$([\s\S]+?)\$\$/g, (_, p1) =>
            `<div class="math-block">$$${p1}$$</div>`
          )
          .replace(/\$([^$]+?)\$/g, (_, p1) =>
            `<span class="math-inline">$${p1}$</span>`
          );

        processedTexts.set(preprocessedText, result);
        resolve(result);
      });
    });

    return renderPromise;
  } catch (error) {
    console.error('渲染错误:', error);
    return originalRender(text);
  }
};

// 优化代码块渲染器
md.renderer.rules.fence = (() => {
  const defaultFence = md.renderer.rules.fence;

  return function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const code = token.content.trim();
    const lang = token.info.trim();

    const rawHtml = defaultFence(tokens, idx, options, env, self);

    return `
      <div class="code-block-wrapper">
        <pre class="code-wrap">${rawHtml}</pre>
        <button class="copy-button" data-code="${encodeURIComponent(code)}">
          <img src="${chrome.runtime.getURL("icons/copy.svg")}" alt="Copy" />
        </button>
      </div>
    `.trim();
  };
})();

// 使用事件委托处理复制按钮点击
document.addEventListener('click', async function(event) {
  const copyButton = event.target.closest('.copy-button');
  if (!copyButton) return;

  console.log('copy button clicked');
  event.preventDefault();
  event.stopPropagation();

  const code = decodeURIComponent(copyButton.dataset.code);
  if (code) {
    try {
      await navigator.clipboard.writeText(code);
      console.log('copied text:', code);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  } else {
    console.warn('No code text found to copy');
  }
}, true);

export { md };