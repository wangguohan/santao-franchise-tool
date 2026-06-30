// 三陶加盟智能选配 - 提交流程后端
// Vercel Serverless Function
// 环境变量（在 Vercel Dashboard 中设置）:
//   FEISHU_APP_ID       - 飞书应用 App ID
//   FEISHU_APP_SECRET   - 飞书应用 App Secret
//   FEISHU_TARGET_OPEN_ID - 接收通知的用户 open_id

const LARK_HOST = 'https://open.feishu.cn';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: '仅支持 POST 请求' });
  }

  const APP_ID = process.env.FEISHU_APP_ID;
  const APP_SECRET = process.env.FEISHU_APP_SECRET;
  const TARGET_OPEN_ID = process.env.FEISHU_TARGET_OPEN_ID;

  if (!APP_ID || !APP_SECRET || !TARGET_OPEN_ID) {
    console.error('Missing environment variables');
    return res.status(500).json({ ok: false, message: '服务配置不完整，请联系管理员' });
  }

  try {
    const { name, phone, city, mode, tierName, price, stage, boxes, hours, perks } = req.body;

    // 1. Get tenant access token
    const tokenRes = await fetch(`${LARK_HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0) {
      throw new Error(`Token error: ${tokenData.msg}`);
    }
    const token = tokenData.tenant_access_token;

    // 2. Build rich text message content
    const content = buildMessageContent({ name, phone, city, mode, tierName, price, stage, boxes, hours, perks });

    // 3. Send message
    const msgRes = await fetch(`${LARK_HOST}/open-apis/im/v1/messages?receive_id_type=open_id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receive_id: TARGET_OPEN_ID,
        msg_type: 'post',
        content: JSON.stringify({
          zh_cn: {
            title: '【新加盟线索】',
            content
          }
        })
      })
    });
    const msgData = await msgRes.json();
    if (msgData.code !== 0) {
      throw new Error(`Send error: ${msgData.msg} (code=${msgData.code})`);
    }

    return res.status(200).json({ ok: true, message: '已提交，专属顾问将尽快联系您' });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ ok: false, message: '提交失败，请稍后重试' });
  }
}

function buildMessageContent(data) {
  const { name, phone, city, mode, tierName, price, stage, boxes, hours, perks } = data;
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const priceStr = price >= 10000 ? (price / 10000).toFixed(0) + '万' : (price || 0).toLocaleString();

  return [
    [{ tag: 'text', text: ' ' }, { tag: 'text', text: '新客户加盟咨询', style: ['bold'] }],
    [{ tag: 'text', text: '\n\n' }, { tag: 'text', text: '姓名：' }, { tag: 'text', text: name || '未填写', style: ['bold'] }],
    [{ tag: 'text', text: '\n手机：' }, { tag: 'text', text: phone || '未填写', style: ['bold'] }],
    [{ tag: 'text', text: `\n城市：${city || '未选择'}` }],
    [{ tag: 'text', text: `\n加盟模式：${mode || '-'}` }],
    [{ tag: 'text', text: `\n方案：${tierName || '-'}`, style: ['bold'] }],
    [{ tag: 'text', text: `\n合作费用：¥${priceStr}` }],
    [{ tag: 'text', text: `\n服务学段：${stage || '-'}` }],
    [{ tag: 'text', text: `\nAI智学盒子：${boxes || '-'}台` }],
    [{ tag: 'text', text: `\n课时：${hours ? hours.toLocaleString() : '-'}` }],
    [{ tag: 'text', text: `\n赠送权益：${perks ? (Array.isArray(perks) ? perks.length + '项' : perks) : '-'}` }],
    [{ tag: 'text', text: `\n\n⏰ ${now}` }],
    [{ tag: 'text', text: '\n来源：智能选配助手' }]
  ];
}
