// POW 计算工具函数
export async function calculatePOW(challenge, salt, targetPath) {
  // 使用 Web Crypto API 进行哈希计算
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  let answer = 0;
  const maxAttempts = 100000;

  for (let i = 0; i < maxAttempts; i++) {
    const message = `${challenge}${salt}${i}`;
    const hash = await sha256(message);

    // 检查哈希值是否满足条件
    if (hash.startsWith('0000')) {
      answer = i;
      break;
    }
  }

  // 计算签名
  const signature = await sha256(`${challenge}${salt}${answer}`);

  // 构建 POW 响应
  return {
    algorithm: 'DeepSeekHashV1',
    challenge,
    salt,
    answer,
    signature,
    target_path: targetPath
  };
}

// 生成 POW 响应
export async function generatePOWResponse(targetPath = '/api/v0/chat/completion') {
  try {
    // 获取 POW 挑战
    const response = await fetch('https://chat.deepseek.com/api/v0/pow/challenge', {
      method: 'GET',
      headers: {
        'Origin': 'https://chat.deepseek.com',
        'Referer': 'https://chat.deepseek.com/'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get POW challenge');
    }

    const { challenge, salt } = await response.json();

    // 计算 POW
    const powResult = await calculatePOW(challenge, salt, targetPath);

    // 返回编码后的响应
    return btoa(JSON.stringify(powResult));
  } catch (error) {
    console.error('Failed to generate POW response:', error);
    return null;
  }
}