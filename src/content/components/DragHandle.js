export function initDraggable(dragHandle, popup) {
  let isDragging = false;
  let startX, startY;
  let initialX, initialY;

  dragHandle.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);

  function startDragging(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = popup.offsetLeft;
    initialY = popup.offsetTop;
    popup.style.transition = 'none';
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    popup.style.left = `${initialX + dx}px`;
    popup.style.top = `${initialY + dy}px`;
  }

  function stopDragging() {
    isDragging = false;
    popup.style.transition = 'transform 0.05s cubic-bezier(0.4, 0, 0.2, 1)';
  }

  return () => {
    dragHandle.removeEventListener('mousedown', startDragging);
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDragging);
  };
}

export function resizeMoveListener(event) {
  const { target, rect } = event;

  Object.assign(target.style, {
    width: `${rect.width}px`,
    height: `${rect.height}px`
  });

  if (event.edges.left) {
    target.style.left = `${rect.left}px`;
  }
  if (event.edges.top) {
    target.style.top = `${rect.top}px`;
  }
}

export function createDragHandle() {
  const dragHandle = document.createElement("div");
  Object.assign(dragHandle.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "40px",
    cursor: "move",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 10px",
    boxSizing: "border-box",
  });

  dragHandle.classList.add('drag-handle');

  const titleContainer = document.createElement("div");
  titleContainer.style.display = "flex";
  titleContainer.style.alignItems = "center";

  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/icon24.png");
  logo.style.height = "24px";
  logo.style.marginRight = "10px";

  const textNode = document.createElement("span");
  textNode.style.fontWeight = "bold";
  textNode.textContent = "DeepSeek AI";
  titleContainer.appendChild(logo);
  titleContainer.appendChild(textNode);

  const closeButton = document.createElement("button");
  closeButton.className = "close-button";
  Object.assign(closeButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
    transition: "all 0.2s ease",
    position: "absolute",
    right: "10px",
  });

  const closeIcon = document.createElement("img");
  closeIcon.src = chrome.runtime.getURL("icons/close.svg");
  closeIcon.style.width = "20px";
  closeIcon.style.height = "20px";

  closeButton.appendChild(closeIcon);
  dragHandle.appendChild(titleContainer);
  dragHandle.appendChild(closeButton);

  dragHandle.addEventListener("mouseenter", () => {
    closeButton.style.display = "block";
  });

  dragHandle.addEventListener("mouseleave", () => {
    closeButton.style.display = "none";
    closeIcon.src = chrome.runtime.getURL("icons/close.svg");
    closeButton.style.transform = "scale(1)";
  });

  closeButton.addEventListener("mouseenter", () => {
    closeIcon.src = chrome.runtime.getURL("icons/closeClicked.svg");
    closeButton.style.transform = "scale(1.1)";
  });

  closeButton.addEventListener("mouseleave", () => {
    closeIcon.src = chrome.runtime.getURL("icons/close.svg");
    closeButton.style.transform = "scale(1)";
  });

  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const popup = document.querySelector("#ai-popup");
    if (popup) {
      // 移除主题监听器
      if (popup._removeThemeListener) {
        popup._removeThemeListener();
      }

      // 清理滚动条实例
      if (window.aiResponseContainer?.perfectScrollbar) {
        window.aiResponseContainer.perfectScrollbar.destroy();
        delete window.aiResponseContainer.perfectScrollbar;
      }

      // 清理滚动状态管理器
      if (window.aiResponseContainer?.scrollStateManager?.cleanup) {
        window.aiResponseContainer.scrollStateManager.cleanup();
      }

      // 移除事件监听器
      if (window.aiResponseContainer?.cleanup) {
        window.aiResponseContainer.cleanup();
      }

      // 移除弹窗
      document.body.removeChild(popup);

      // 清理全局引用
      window.aiResponseContainer = null;
    }
  });

  return dragHandle;
}