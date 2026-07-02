// 三陶加盟智能选配 - 提交流程代理
// 简单代理：前端 → Vercel → Lark Webhook
// 避免浏览器跨域问题

const WEBHOOK_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/142a77ed-c93c-441c-a35a-5a442c48e4dc';
const TIMEOUT_MS = 10000;

function fetchWithTimeout(url, options, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: '仅支持 POST' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const webhookRes = await fetchWithTimeout(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await webhookRes.json();
    if (webhookRes.ok && result.code === 0) {
      return res.status(200).json({ ok: true, message: '已提交，专属顾问将尽快联系您' });
    }
    console.error('Webhook error:', result);
    return res.status(502).json({ ok: false, message: '提交失败，请稍后重试' });
  } catch (err) {
    console.error('Proxy error:', err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({ ok: false, message: '请求超时，请重试' });
    }
    return res.status(500).json({ ok: false, message: '网络异常，请重试' });
  }
}
