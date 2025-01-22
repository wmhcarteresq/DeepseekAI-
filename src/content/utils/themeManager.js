import { THEME_CLASSES } from './constants';

export function isDarkMode() {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;

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

  const bodyColor = parseColor(bodyBg);
  const htmlColor = parseColor(htmlBg);

  const effectiveColor = bodyColor?.isTransparent ? htmlColor : bodyColor;

  if (!effectiveColor || effectiveColor.isTransparent) {
    return false;
  }

  const isDark = effectiveColor.brightness < 128;

  return isDark;
}

export function watchThemeChanges(callback) {
  const observer = new MutationObserver(() => {
    const isDark = isDarkMode();
    callback(isDark);
  });

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

  const initialTheme = isDarkMode();
  callback(initialTheme);

  return () => observer.disconnect();
}

export function applyTheme(popup, isDark) {
  if (isDark) {
    popup.classList.add('dark-mode');
  } else {
    popup.classList.remove('dark-mode');
  }
}