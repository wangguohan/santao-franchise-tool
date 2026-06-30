// 三陶加盟智能选配 - 健康检查
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    env: {
      appId: !!process.env.FEISHU_APP_ID,
      appSecret: !!process.env.FEISHU_APP_SECRET,
      targetOpenId: !!process.env.FEISHU_TARGET_OPEN_ID
    },
    time: new Date().toISOString()
  });
}
