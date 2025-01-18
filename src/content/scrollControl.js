let allowAutoScroll = true;
let isUserScrolling = false;
let scrollTimeout = null;
let lastScrollTime = 0;
const SCROLL_THROTTLE = 50; // 50ms 的节流时间

export function setAllowAutoScroll(value) {
  allowAutoScroll = value;
}

export function getAllowAutoScroll() {
  return allowAutoScroll && !isUserScrolling;
}

export function updateAllowAutoScroll(container) {
  if (isUserScrolling) return;

  const { scrollTop, scrollHeight, clientHeight } = container;
  const threshold = 100; // 100px的阈值
  allowAutoScroll = scrollHeight - (scrollTop + clientHeight) <= threshold;
}

export function handleUserScroll() {
  const now = Date.now();
  if (now - lastScrollTime < SCROLL_THROTTLE) return;
  lastScrollTime = now;

  isUserScrolling = true;
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  scrollTimeout = setTimeout(() => {
    isUserScrolling = false;
  }, 300); // 增加到 300ms
}

export function scrollToBottom(container) {
  if (!getAllowAutoScroll()) return;

  // 使用 transform 可能导致其他问题，改用简单的滚动
  requestAnimationFrame(() => {
    try {
      container.scrollTop = container.scrollHeight;
    } catch (error) {
      console.error('Scroll error:', error);
    }
  });
}
