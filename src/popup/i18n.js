export class I18nManager {
  constructor() {
    this.translations = {
      zh: {
        validating: '正在验证...',
        saveSuccess: '保存成功',
        apiKeyInvalid: 'API Key 无效',
        noBalance: '暂无余额',
        noApiKey: '请先设置 API Key',
        fetchError: '获取失败',
        rememberWindowSize: '保存窗口大小'
      },
      en: {
        validating: 'Validating...',
        saveSuccess: 'Saved successfully',
        apiKeyInvalid: 'Invalid API Key',
        noBalance: 'No balance',
        noApiKey: 'Please set API Key first',
        fetchError: 'Failed to fetch',
        rememberWindowSize: 'Save window size'
      }
    };
  }

  getCurrentLang() {
    return localStorage.getItem('preferredLang') || 'en';
  }

  setCurrentLang(lang) {
    localStorage.setItem('preferredLang', lang);
  }

  getTranslation(key) {
    const currentLang = this.getCurrentLang();
    return this.translations[currentLang][key] || key;
  }
}