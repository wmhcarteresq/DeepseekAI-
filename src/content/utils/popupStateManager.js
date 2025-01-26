// 管理弹窗状态的单例模块
class PopupStateManager {
  constructor() {
    this.isCreatingPopup = false;
    this.isPopupVisible = false;
  }

  setCreating(value) {
    this.isCreatingPopup = value;
  }

  setVisible(value) {
    this.isPopupVisible = value;
  }

  isCreating() {
    return this.isCreatingPopup;
  }

  isVisible() {
    return this.isPopupVisible;
  }

  reset() {
    this.isCreatingPopup = false;
    this.isPopupVisible = false;
  }
}

// 导出单例实例
export const popupStateManager = new PopupStateManager();