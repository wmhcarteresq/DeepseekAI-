// 检测当前页面是否为暗色模式
export function isDarkMode() {
  // 获取背景色
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;

  // 解析RGB值并检查是否为透明
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

  // 分析背景色
  const bodyColor = parseColor(bodyBg);
  const htmlColor = parseColor(htmlBg);

  console.log('[Color Analysis]', {
    bodyColor: bodyBg,
    htmlColor: htmlBg,
    bodyParsed: bodyColor,
    htmlParsed: htmlColor
  });

  // 如果body背景是透明的，使用html背景
  const effectiveColor = bodyColor?.isTransparent ? htmlColor : bodyColor;

  // 如果两个背景都是透明的，默认使用亮色模式
  if (!effectiveColor || effectiveColor.isTransparent) {
    console.log('[Theme Decision]', 'Both backgrounds transparent, defaulting to light mode');
    return false;
  }

  const isDark = effectiveColor.brightness < 128;

  console.log('[Theme Detection]', {
    effectiveBackground: effectiveColor,
    isDarkMode: isDark
  });

  return isDark;
}

// 监听主题变化
export function watchThemeChanges(callback) {
  const observer = new MutationObserver(() => {
    const isDark = isDarkMode();
    callback(isDark);
  });

  // 监听 body 和 html 的变化
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style', 'class'],
    childList: false,
    subtree: false
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style', 'class'],
    childList: false,
    subtree: false
  });

  // 立即进行初始检查
  const initialTheme = isDarkMode();
  callback(initialTheme);

  return () => observer.disconnect();
}

// 应用主题到popup
export function applyTheme(popup, isDark) {
  console.log('[Theme Application]', {
    currentTheme: popup.classList.contains('dark-mode') ? 'Dark' : 'Light',
    settingTo: isDark ? 'Dark' : 'Light'
  });

  if (isDark) {
    popup.classList.add('dark-mode');
  } else {
    popup.classList.remove('dark-mode');
  }
}