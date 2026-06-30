// 三陶加盟智能选配 - 提交流程后端
// Vercel Serverless Function
// 环境变量（在 Vercel Dashboard 中设置）:
//   FEISHU_APP_ID       - 飞书应用 App ID
//   FEISHU_APP_SECRET   - 飞书应用 App Secret
//   FEISHU_TARGET_OPEN_ID - 接收通知的用户 open_id

const LARK_HOST = 'https://open.feishu.cn';
const TIMEOUT_MS = 8000;

// fetch with timeout
function fetchWithTimeout(url, options, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: '仅支持 POST 请求' });
  }

  const APP_ID = process.env.FEISHU_APP_ID;
  const APP_SECRET = process.env.FEISHU_APP_SECRET;
  const TARGET_OPEN_ID = process.env.FEISHU_TARGET_OPEN_ID;

  if (!APP_ID || !APP_SECRET || !TARGET_OPEN_ID) {
    console.error('Missing env:', { APP_ID: !!APP_ID, APP_SECRET: !!APP_SECRET, TARGET_OPEN_ID: !!TARGET_OPEN_ID });
    return res.status(500).json({ ok: false, message: '服务配置不完整' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, phone, city, mode, tierName, price, stage, boxes, hours, perks } = body;

    // 1. Get tenant access token
    const tokenRes = await fetchWithTimeout(`${LARK_HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0) throw new Error(`Token error: ${tokenData.msg}`);

    // 2. Build & send message
    const token = tokenData.tenant_access_token;
    const content = buildContent({ name, phone, city, mode, tierName, price, stage, boxes, hours, perks });

    const msgRes = await fetchWithTimeout(`${LARK_HOST}/open-apis/im/v1/messages?receive_id_type=open_id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receive_id: TARGET_OPEN_ID,
        msg_type: 'post',
        content: JSON.stringify({ zh_cn: { title: '【新加盟线索】', content } })
      })
    });
    const msgData = await msgRes.json();
    if (msgData.code !== 0) throw new Error(`Send error: ${msgData.msg} (code=${msgData.code})`);

    return res.status(200).json({ ok: true, message: '已提交，专属顾问将尽快联系您' });

  } catch (err) {
    console.error('Submit error:', err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({ ok: false, message: '请求超时，请重试' });
    }
    return res.status(500).json({ ok: false, message: '提交失败，请稍后重试' });
  }
}

function buildContent(d) {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const pStr = d.price >= 10000 ? (d.price / 10000).toFixed(0) + '万' : (d.price || 0).toLocaleString();
  return [
    [{ tag: 'text', text: ' ' }, { tag: 'text', text: '新客户加盟咨询', style: ['bold'] }],
    [{ tag: 'text', text: '\n\n' }, { tag: 'text', text: '姓名：' }, { tag: 'text', text: d.name || '未填写', style: ['bold'] }],
    [{ tag: 'text', text: '\n手机：' }, { tag: 'text', text: d.phone || '未填写', style: ['bold'] }],
    [{ tag: 'text', text: `\n城市：${d.city || '未选择'}` }],
    [{ tag: 'text', text: `\n加盟模式：${d.mode || '-'}` }],
    [{ tag: 'text', text: `\n方案：${d.tierName || '-'}`, style: ['bold'] }],
    [{ tag: 'text', text: `\n合作费用：¥${pStr}` }],
    [{ tag: 'text', text: `\n服务学段：${d.stage || '-'}` }],
    [{ tag: 'text', text: `\nAI智学盒子：${d.boxes || '-'}台` }],
    [{ tag: 'text', text: `\n课时：${d.hours ? d.hours.toLocaleString() : '-'}` }],
    [{ tag: 'text', text: `\n赠送：${d.perks ? (Array.isArray(d.perks) ? d.perks.length + '项' : d.perks) : '-'}` }],
    [{ tag: 'text', text: `\n\n⏰ ${now}` }],
    [{ tag: 'text', text: '\n来源：智能选配助手' }]
  ];
}
