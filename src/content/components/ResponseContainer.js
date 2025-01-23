import PerfectScrollbar from 'perfect-scrollbar';
import { createScrollManager, getAllowAutoScroll, handleUserScroll, updateAllowAutoScroll } from '../utils/scrollManager';
import { SCROLL_CONSTANTS } from '../utils/constants';

export function styleResponseContainer(container) {
  container.id = "ai-response-container";
  Object.assign(container.style, {
    flex: "1",
    minHeight: "0",
    position: "relative",
    marginBottom: "60px",
    overflowY: "auto",
    overflowX: "hidden",
    padding: "20px 10px",
    paddingBottom: "60px",
    boxSizing: "border-box",
    userSelect: "text",
    "-webkit-user-select": "text",
    "-moz-user-select": "text",
    "-ms-user-select": "text",
  });

  const scrollManager = createScrollManager();
  container.scrollStateManager = scrollManager;

  const handleScroll = (e) => {
    if (!scrollManager) return;

    scrollManager.setManualScrolling(true);
    scrollManager.saveScrollPosition(container);
    handleUserScroll(e);

    requestAnimationFrame(() => {
      if (container.perfectScrollbar) {
        container.perfectScrollbar.update();
      }

      if (!scrollManager.isInCooldown()) {
        const isAtBottom = scrollManager.isNearBottom(container);
        updateAllowAutoScroll(container);

        if (isAtBottom && getAllowAutoScroll()) {
          const lastMessage = container.querySelector('#ai-response > div:last-child');
          if (lastMessage) {
            const containerRect = container.getBoundingClientRect();
            const messageRect = lastMessage.getBoundingClientRect();
            const BUTTON_SPACE = 100;
            const HOVER_BUTTON_HEIGHT = 40;
            const extraScroll = Math.max(0, messageRect.bottom + BUTTON_SPACE + HOVER_BUTTON_HEIGHT - containerRect.bottom);
            if (extraScroll > 0) {
              container.scrollTop += extraScroll;
              container.perfectScrollbar?.update();
            }
          }
        }
      }
    });

    if (scrollManager.scrollTimeout) {
      clearTimeout(scrollManager.scrollTimeout);
    }
    scrollManager.scrollTimeout = setTimeout(() => {
      scrollManager.setManualScrolling(false);
    }, 150);
  };

  container.addEventListener('scroll', handleScroll, { passive: true });
  container.addEventListener('wheel', handleScroll, { passive: true });
  container.addEventListener('touchstart', handleScroll, { passive: true });
  container.addEventListener('touchmove', handleScroll, { passive: true });

  return container;
}