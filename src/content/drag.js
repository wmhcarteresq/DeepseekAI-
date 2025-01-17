export function dragMoveListener(event) {
  const target = event.target.parentNode;
  const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
  const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

  target.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  target.style.willChange = 'transform';

  requestAnimationFrame(() => {
    target.setAttribute("data-x", x);
    target.setAttribute("data-y", y);
  });
}

export function resizeMoveListener(event) {
  let { x, y } = event.target.dataset;
  x = (parseFloat(x) || 0) + event.deltaRect.left;
  y = (parseFloat(y) || 0) + event.deltaRect.top;

  const target = event.target;
  const width = `${event.rect.width}px`;
  const height = `${event.rect.height}px`;

  requestAnimationFrame(() => {
    target.style.willChange = 'transform, width, height';
    target.style.setProperty('--popup-width', width);
    target.style.setProperty('--popup-height', height);
    target.style.width = 'var(--popup-width)';
    target.style.height = 'var(--popup-height)';
    target.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    target.dataset.x = x;
    target.dataset.y = y;
  });
}
