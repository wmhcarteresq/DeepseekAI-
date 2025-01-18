let allowAutoScroll = true;
let isUserScrolling = false;
const SCROLL_THRESHOLD = 50; // 距离底部的阈值

export function setAllowAutoScroll(value) {
  allowAutoScroll = value;
}

export function getAllowAutoScroll() {
  return allowAutoScroll;
}

export function updateAllowAutoScroll(container) {
  const { scrollTop, scrollHeight, clientHeight } = container;
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

  // 只有当滚动到接近底部时才启用自动滚动
  if (distanceFromBottom <= SCROLL_THRESHOLD) {
    allowAutoScroll = true;
  }
}

export function handleUserScroll() {
  // 用户手动滚动时，禁用自动滚动
  allowAutoScroll = false;
}

export function scrollToBottom(container) {
  if (!getAllowAutoScroll()) return;

  requestAnimationFrame(() => {
    try {
      container.scrollTop = container.scrollHeight;
    } catch (error) {
      console.error('Scroll error:', error);
    }
  });
}
