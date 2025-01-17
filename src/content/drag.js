export function initDraggable(dragHandle, popup) {
  let isDragging = false;
  let startX;
  let startY;
  let lastX = 0;
  let lastY = 0;

  dragHandle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target === dragHandle || dragHandle.contains(e.target)) {
      const rect = popup.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      isDragging = true;
      popup.classList.add('dragging');
    }
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();

    const newX = e.clientX - startX;
    const newY = e.clientY - startY;

    // 确保不超出视口边界
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = popup.getBoundingClientRect();

    const maxX = viewportWidth - rect.width;
    const maxY = viewportHeight - rect.height;

    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));

    lastX = boundedX;
    lastY = boundedY;

    setPosition(boundedX, boundedY);
  }

  function dragEnd() {
    isDragging = false;
    popup.classList.remove('dragging');
  }

  function setPosition(x, y) {
    popup.style.position = 'fixed';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.zIndex = '2147483647';
  }

  // 设置初始位置
  const rect = popup.getBoundingClientRect();
  setPosition(rect.left, rect.top);
}

export function resizeMoveListener(event) {
  let { x, y } = event.target.dataset;
  x = (parseFloat(x) || 0) + event.deltaRect.left;
  y = (parseFloat(y) || 0) + event.deltaRect.top;

  const target = event.target;
  const width = `${event.rect.width}px`;
  const height = `${event.rect.height}px`;

  requestAnimationFrame(() => {
    target.style.willChange = 'width, height';
    target.style.setProperty('--popup-width', width);
    target.style.setProperty('--popup-height', height);
    target.style.width = 'var(--popup-width)';
    target.style.height = 'var(--popup-height)';
    target.dataset.x = x;
    target.dataset.y = y;
  });
}
