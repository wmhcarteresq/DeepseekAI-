// DeepSeek Web Chat API 实现
export class DeepSeekWebChat {
    constructor() {
        this.baseUrl = 'https://chat.deepseek.com';
        this.sessionId = null;
        this.authToken = null;
    }

    // 检查用户是否已登录
    async checkLoginStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v0/user/profile`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Failed to check login status:', error);
            return false;
        }
    }

    // 从 cookie 中获取必要的认证信息
    async getAuthInfo() {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'ds_session_id') {
                this.sessionId = value;
            }
            // 注意：实际的 token 可能需要其他方式获取
        }
    }

    // 发送消息并获取响应
    async sendMessage(message, conversationId = null) {
        await this.getAuthInfo();

        if (!this.sessionId) {
            throw new Error('未登录或会话已过期');
        }

        const response = await fetch(`${this.baseUrl}/api/v0/chat/completion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'X-DS-Session-ID': this.sessionId,
            },
            credentials: 'include',
            body: JSON.stringify({
                messages: [{
                    role: 'user',
                    content: message
                }],
                conversation_id: conversationId,
                stream: true
            })
        });

        return response.body;
    }

    // 处理 SSE 响应
    async* processStreamResponse(response) {
        const reader = response.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        yield parsed;
                    } catch (e) {
                        console.error('Failed to parse SSE data:', e);
                    }
                }
            }
        }
    }
}