import { setWebSession, setMode } from './api';

// 检查网页版登录状态
export async function checkWebLogin() {
  try {
    const response = await fetch('https://chat.deepseek.com/', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Origin': 'https://chat.deepseek.com',
        'Referer': 'https://chat.deepseek.com/',
      }
    });

    if (response.ok) {
      // 获取 session 信息
      const cookies = document.cookie.split(';');
      const sessionId = cookies.find(cookie => cookie.trim().startsWith('ds_session_id='));
      const authHeader = await getAuthorizationHeader();

      if (sessionId && authHeader) {
        setWebSession({
          sessionId: sessionId.split('=')[1].trim(),
          authorization: authHeader
        });
        setMode('web');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Failed to check web login status:', error);
    return false;
  }
}

// 获取授权头
async function getAuthorizationHeader() {
  try {
    // 这里需要实现实际的获取逻辑
    // 为了演示,返回一个模拟值
    return 'Bearer DjGqYWvFYMcAb5cIQ/ByL2HT2hc6DeEkiA3YXvge80K1zAYDwc2m1OufA8HTSPS9';
  } catch (error) {
    console.error('Failed to get authorization header:', error);
    return null;
  }
}

// 监听登录状态变化
export function watchLoginStatus(callback) {
  let lastSessionId = document.cookie.match(/ds_session_id=([^;]+)/)?.[1];

  setInterval(async () => {
    const currentSessionId = document.cookie.match(/ds_session_id=([^;]+)/)?.[1];
    if (currentSessionId !== lastSessionId) {
      lastSessionId = currentSessionId;
      const isLoggedIn = await checkWebLogin();
      callback(isLoggedIn);
    }
  }, 1000);
}