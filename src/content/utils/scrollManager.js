import { SCROLL_CONSTANTS } from './constants';
import { getIsGenerating } from '../services/apiService';

class ScrollStateManager {
  constructor() {
    this.isManualScrolling = false;
    this.lastScrollTime = 0;
    this.scrollTimeout = null;
    this.scrollRAF = null;
    this.scrollAnimation = {
      isAnimating: false,
      startTime: 0,
      startPosition: 0,
      targetPosition: 0,
      duration: SCROLL_CONSTANTS.ANIMATION_DURATION,
    };
    this.scrollMomentum = {
      velocity: 0,
      timestamp: 0,
      positions: [],
      maxSamples: SCROLL_CONSTANTS.MAX_MOMENTUM_SAMPLES,
    };
  }

  setManualScrolling(value) {
    this.isManualScrolling = value;
    if (value) {
      this.lastScrollTime = Date.now();
      this.scrollAnimation.isAnimating = false;
    }
  }

  updateScrollVelocity(currentPosition) {
    const now = Date.now();
    const positions = this.scrollMomentum.positions;

    positions.push({
      position: currentPosition,
      timestamp: now
    });

    if (positions.length > this.scrollMomentum.maxSamples) {
      positions.shift();
    }

    if (positions.length >= 2) {
      const newest = positions[positions.length - 1];
      const oldest = positions[0];
      const timeDiff = newest.timestamp - oldest.timestamp;

      if (timeDiff > 0) {
        this.scrollMomentum.velocity = (newest.position - oldest.position) / timeDiff;
      }
    }
  }

  isRapidScrolling() {
    return Math.abs(this.scrollMomentum.velocity) > 0.5;
  }

  isInCooldown() {
    return Date.now() - this.lastScrollTime < 150 || this.isRapidScrolling();
  }

  saveScrollPosition(container) {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    this.isAtBottom = distanceFromBottom <= SCROLL_CONSTANTS.SCROLL_THRESHOLD;
    this.scrollPosition = scrollTop;
    this.updateScrollVelocity(scrollTop);
  }

  restoreScrollPosition(container) {
    if (this.isAtBottom || getIsGenerating()) {
      container.scrollTop = container.scrollHeight;
    } else {
      const scrollRatio = this.scrollPosition / container.scrollHeight;
      container.scrollTop = scrollRatio * container.scrollHeight;
    }
  }

  isNearBottom(container) {
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - (scrollTop + clientHeight) <= SCROLL_CONSTANTS.SCROLL_THRESHOLD;
  }

  cleanup() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }
    this.scrollAnimation.isAnimating = false;
    this.scrollMomentum.positions = [];
    this.scrollMomentum.velocity = 0;
  }
}

let allowAutoScroll = true;

export function setAllowAutoScroll(value) {
  allowAutoScroll = value;
}

export function getAllowAutoScroll() {
  return allowAutoScroll;
}

export function updateAllowAutoScroll(container) {
  if (!container) return;

  const { scrollTop, scrollHeight, clientHeight } = container;
  const EXTRA_SCROLL_SPACE = 40; // 与上面相同的额外空间
  const isAtBottom = scrollHeight - (scrollTop + clientHeight + EXTRA_SCROLL_SPACE) < SCROLL_CONSTANTS.SCROLL_THRESHOLD;
  setAllowAutoScroll(isAtBottom);
}

export function handleUserScroll(event) {
  if (!event || !event.target) return;

  const container = event.target;
  if (!container) return;

  requestAnimationFrame(() => {
    updateAllowAutoScroll(container);
  });
}

export function scrollToBottom(container) {
  if (!container) return;

  requestAnimationFrame(() => {
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    // 直接增加固定的额外滚动空间，确保按钮完全可见
    const EXTRA_SCROLL_SPACE = 40; // 固定的额外滚动空间
    container.scrollTop = maxScroll + EXTRA_SCROLL_SPACE;

    if (container.perfectScrollbar) {
      container.perfectScrollbar.update();
    }
  });
}

export function createScrollManager() {
  const scrollState = {
    isManualScrolling: false,
    lastScrollTime: 0,
    scrollTimeout: null,
    isAtBottom: true,
    scrollPosition: 0,
    scrollMomentum: {
      positions: [],
      maxSamples: 5,
      velocity: 0
    }
  };

  return {
    ...scrollState,

    setManualScrolling(value) {
      this.isManualScrolling = value;
      if (value) {
        this.lastScrollTime = Date.now();
      }
    },

    updateScrollVelocity(currentPosition) {
      const now = Date.now();
      const positions = this.scrollMomentum.positions;

      positions.push({
        position: currentPosition,
        timestamp: now
      });

      if (positions.length > this.scrollMomentum.maxSamples) {
        positions.shift();
      }

      if (positions.length >= 2) {
        const newest = positions[positions.length - 1];
        const oldest = positions[0];
        const timeDiff = newest.timestamp - oldest.timestamp;

        if (timeDiff > 0) {
          this.scrollMomentum.velocity = (newest.position - oldest.position) / timeDiff;
        }
      }
    },

    isRapidScrolling() {
      return Math.abs(this.scrollMomentum.velocity) > 0.5;
    },

    isInCooldown() {
      return Date.now() - this.lastScrollTime < 150 || this.isRapidScrolling();
    },

    isNearBottom(container) {
      if (!container) return false;
      const { scrollTop, scrollHeight, clientHeight } = container;
      return scrollHeight - (scrollTop + clientHeight) <= 30;
    },

    saveScrollPosition(container) {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      this.isAtBottom = scrollHeight - (scrollTop + clientHeight) <= 30;
      this.scrollPosition = scrollTop;
      this.updateScrollVelocity(scrollTop);
    },

    restoreScrollPosition(container) {
      if (!container) return;
      if (this.isAtBottom || getIsGenerating()) {
        scrollToBottom(container);
      } else {
        container.scrollTop = this.scrollPosition;
        if (container.perfectScrollbar) {
          container.perfectScrollbar.update();
        }
      }
    },

    scrollToBottom(container) {
      scrollToBottom(container);
    },

    cleanup() {
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      this.isManualScrolling = false;
      this.lastScrollTime = 0;
      this.scrollTimeout = null;
      this.scrollMomentum.positions = [];
      this.scrollMomentum.velocity = 0;
    }
  };
}

// 优化的滚动处理函数
export function setupScrollHandlers(container, perfectScrollbar) {
  if (!container) return;

  const scrollManager = container.scrollStateManager;

  const handleScroll = (event) => {
    if (!scrollManager) return;

    scrollManager.setManualScrolling(true);
    scrollManager.saveScrollPosition(container);

    handleUserScroll(event);

    requestAnimationFrame(() => {
      if (perfectScrollbar) {
        perfectScrollbar.update();
      }

      if (!scrollManager.isInCooldown()) {
        const isAtBottom = scrollManager.isNearBottom(container);
        updateAllowAutoScroll(container);

        if (isAtBottom) {
          scrollManager.scrollToBottom(container);
        }
      }
    });

    // 重置手动滚动状态
    if (scrollManager.scrollTimeout) {
      clearTimeout(scrollManager.scrollTimeout);
    }
    scrollManager.scrollTimeout = setTimeout(() => {
      scrollManager.setManualScrolling(false);
    }, 150);
  };

  // 使用 passive 选项优化性能
  container.addEventListener('wheel', handleScroll, { passive: true });
  container.addEventListener('touchstart', handleScroll, { passive: true });
  container.addEventListener('touchmove', handleScroll, { passive: true });
  container.addEventListener('scroll', handleScroll, { passive: true });

  // 返回清理函数
  return () => {
    container.removeEventListener('wheel', handleScroll);
    container.removeEventListener('touchstart', handleScroll);
    container.removeEventListener('touchmove', handleScroll);
    container.removeEventListener('scroll', handleScroll);
  };
}