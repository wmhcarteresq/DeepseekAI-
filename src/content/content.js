import { createIcon } from "./icon";
import { createPopup } from "./popup";
import "perfect-scrollbar/css/perfect-scrollbar.css";

let currentIcon = null;
let isCreatingPopup = false;
let isHandlingIconClick = false;

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("style.css");
document.head.appendChild(link);

function removeIcon() {
  if (currentIcon && document.body.contains(currentIcon)) {
    document.body.removeChild(currentIcon);
    currentIcon = null;
  }
}

function handlePopupCreation(selectedText, rect, hideQuestion = false) {
  console.log('开始创建弹窗', { selectedText, rect });

  if (isCreatingPopup) {
    console.log('已经在创建弹窗中，返回');
    return;
  }

  isCreatingPopup = true;
  console.log('设置创建标志');

  const existingPopup = document.querySelector('#ai-popup');
  if (existingPopup) {
    console.log('移除已存在的弹窗');
    document.body.removeChild(existingPopup);
  }

  console.log('调用createPopup');
  createPopup(selectedText, rect, hideQuestion);

  setTimeout(() => {
    console.log('重置创建标志');
    isCreatingPopup = false;
  }, 100);
}

function handleIconClick(e, selectedText, rect, selection) {
  console.log('处理图标点击');
  e.stopPropagation();
  e.preventDefault();

  isHandlingIconClick = true;
  removeIcon();
  selection.removeAllRanges();
  handlePopupCreation(selectedText, rect);

  setTimeout(() => {
    isHandlingIconClick = false;
  }, 100);
}

document.addEventListener("mouseup", function (event) {
  if (isCreatingPopup || isHandlingIconClick) return;

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText && event.button === 0) {
    console.log('选中文本，创建图标', { selectedText });
    removeIcon();

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    currentIcon = createIcon(x + 5, y - 25);

    currentIcon.addEventListener("mousedown", function(e) {
      console.log('图标被点击 - mousedown');
      handleIconClick(e, selectedText, rect, selection);
    });

    document.body.appendChild(currentIcon);
    console.log('图标已添加到页面');
  }
});

document.addEventListener("mousedown", function(e) {
  if (isHandlingIconClick) return;

  console.log('全局mousedown事件', e.target.tagName);
  if (currentIcon && !currentIcon.contains(e.target)) {
    console.log('点击了图标以外的区域');
    removeIcon();
    if (e.button === 0) {
      window.getSelection().removeAllRanges();
    }
  }
}, true);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createPopup") {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    let rect;

    if (selection.rangeCount > 0 && (selectedText || request.selectedText)) {
      rect = selection.getRangeAt(0).getBoundingClientRect();
    } else {
      // 如果没有选中文本，将弹窗放在页面中心
      rect = {
        left: window.innerWidth / 2 - 290,
        top: window.innerHeight / 2 - 190,
        width: 0,
        height: 0
      };
    }

    // 优先使用选中的文本，其次使用请求中的文本，最后使用问候语
    const text = selectedText || request.selectedText || request.message;
    handlePopupCreation(text, rect, !(selectedText || request.selectedText));
  }
});
