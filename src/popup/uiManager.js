export class UiManager {
  constructor() {
    this.elements = {
      apiKeyInput: document.getElementById("apiKey"),
      toggleButton: document.getElementById("toggleVisibility"),
      iconSwitch: document.getElementById("iconSwitch"),
      languageSelect: document.getElementById("language"),
      modelSelect: document.getElementById("model"),
      selectionEnabled: document.getElementById("selectionEnabled"),
      rememberWindowSize: document.getElementById("rememberWindowSize"),
      pinWindow: document.getElementById("pinWindow"),
      balanceToggle: document.getElementById('balanceToggle'),
      balanceIcon: document.getElementById('balanceIcon'),
      balanceContent: document.getElementById('balanceContent'),
      totalBalance: document.getElementById('totalBalance')
    };
    this.isBalanceVisible = false;
  }

  showMessage(message, isSuccess) {
    const messageContainer = document.querySelector('.input-container');
    if (!messageContainer) return;

    const oldMessage = document.querySelector('.error-message, .success-message');
    if (oldMessage) {
      oldMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = isSuccess ? 'success-message' : 'error-message';
    messageDiv.innerHTML = message;

    messageContainer.insertBefore(messageDiv, messageContainer.firstChild);

    if (!message.includes('loading')) {
      setTimeout(() => {
        messageDiv.remove();
      }, 2000);
    }
  }

  showLoadingState() {
    this.elements.totalBalance.innerHTML = '<span class="loading"></span>';
  }

  updateBalanceDisplay(balanceData, noBalanceText) {
    if (!balanceData.is_available) {
      this.elements.totalBalance.textContent = noBalanceText;
      return;
    }

    const info = balanceData.balance_infos[0];
    this.elements.totalBalance.textContent = new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: info.currency || 'CNY',
      minimumFractionDigits: 2
    }).format(info.total_balance);
  }

  toggleBalance() {
    this.isBalanceVisible = !this.isBalanceVisible;
    this.elements.balanceContent.classList.toggle('show');
    this.elements.balanceIcon.src = this.isBalanceVisible ? '../icons/show.svg' : '../icons/hiddle.svg';
    return this.isBalanceVisible;
  }

  toggleApiKeyVisibility() {
    const isPassword = this.elements.apiKeyInput.type === "password";
    this.elements.apiKeyInput.type = isPassword ? "text" : "password";
    this.elements.iconSwitch.src = isPassword ? "../icons/hiddle.svg" : "../icons/show.svg";
  }

  getApiKeyValue() {
    return this.elements.apiKeyInput.value.trim();
  }

  setApiKeyValue(value) {
    this.elements.apiKeyInput.value = value;
  }
}