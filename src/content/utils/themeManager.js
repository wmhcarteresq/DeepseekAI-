import { THEME_CLASSES } from './constants';

export function isDarkMode() {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
  const bodyColor = window.getComputedStyle(document.body).color;
  const htmlColor = window.getComputedStyle(document.documentElement).color;

  function parseColor(color) {
    const match = color.match(/\d+/g);
    if (!match) return null;

    const [r, g, b, a = 255] = match.map(Number);
    const isTransparent = a === 0;

    return {
      r, g, b, a,
      isTransparent,
      brightness: (r * 299 + g * 587 + b * 114) / 1000
    };
  }

  const bodyBgColor = parseColor(bodyBg);
  const htmlBgColor = parseColor(htmlBg);
  const bodyTextColor = parseColor(bodyColor);
  const htmlTextColor = parseColor(htmlColor);

  // 优先使用背景色判断
  const effectiveBgColor = bodyBgColor?.isTransparent ? htmlBgColor : bodyBgColor;
  // 如果背景色无法判断，使用文字颜色
  const effectiveTextColor = bodyTextColor?.isTransparent ? htmlTextColor : bodyTextColor;

  if (effectiveBgColor && !effectiveBgColor.isTransparent) {
    return effectiveBgColor.brightness < 128;
  }

  // 如果背景色无法判断，通过文字颜色反推
  if (effectiveTextColor && !effectiveTextColor.isTransparent) {
    return effectiveTextColor.brightness > 128;
  }

  // 如果都无法判断，使用系统主题
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function watchThemeChanges(callback) {
  let currentTheme = isDarkMode();

  // 创建性能优化的防抖函数
  const debouncedCallback = debounce((isDark) => {
    if (currentTheme !== isDark) {
      currentTheme = isDark;
      callback(isDark);
    }
  }, 50);

  // 监听 DOM 变化
  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => {
      debouncedCallback(isDarkMode());
    });
  });

  // 监听更多的属性变化
  const observerConfig = {
    attributes: true,
    attributeFilter: ['style', 'class', 'data-theme', 'data-color-mode'],
    childList: false,
    subtree: false,
    characterData: false
  };

  // 监听 HTML 和 BODY 元素
  observer.observe(document.documentElement, observerConfig);
  observer.observe(document.body, observerConfig);

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const mediaQueryHandler = (e) => {
    requestAnimationFrame(() => {
      debouncedCallback(isDarkMode());
    });
  };

  mediaQuery.addEventListener('change', mediaQueryHandler);

  // 初始化主题
  const initialTheme = isDarkMode();
  callback(initialTheme);

  // 返回清理函数
  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener('change', mediaQueryHandler);
  };
}

// 添加防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function applyTheme(popup, isDark) {
  requestAnimationFrame(() => {
    if (isDark) {
      popup.classList.add('dark-mode');
      popup.classList.remove('light-mode');
    } else {
      popup.classList.remove('dark-mode');
      popup.classList.add('light-mode');
    }
  });
}