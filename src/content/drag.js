export function dragMoveListener(event) {
  const target = event.target.parentNode;
  const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
  const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

  target.style.transform = `translate3d(${x}px, ${y}px, 0)`;

  requestAnimationFrame(() => {
    target.setAttribute("data-x", x);
    target.setAttribute("data-y", y);
  });
}

export function resizeMoveListener(event) {
  let { x, y } = event.target.dataset;
  x = (parseFloat(x) || 0) + event.deltaRect.left;
  y = (parseFloat(y) || 0) + event.deltaRect.top;

  const style = event.target.style;
  const width = `${event.rect.width}px`;
  const height = `${event.rect.height}px`;

  requestAnimationFrame(() => {
    style.setProperty('--popup-width', width);
    style.setProperty('--popup-height', height);
    style.width = 'var(--popup-width)';
    style.height = 'var(--popup-height)';
    style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  requestAnimationFrame(() => {
    event.target.dataset.x = x;
    event.target.dataset.y = y;
  });
}
