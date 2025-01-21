export class BalanceManager {
  constructor() {
    this.isBalanceLoading = false;
  }

  async fetchBalance(apiKey) {
    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  formatBalance(balance, currency) {
    const num = parseFloat(balance);
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY',
      minimumFractionDigits: 2
    }).format(num);
  }

  isLoading() {
    return this.isBalanceLoading;
  }

  setLoading(loading) {
    this.isBalanceLoading = loading;
  }
}