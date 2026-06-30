# 三陶加盟智能选配助手 - 部署指南

## 部署到 Vercel（推荐）

### 方法一：通过 GitHub 导入（推荐）

1. 将本项目推送到你的 GitHub 仓库
2. 登录 [vercel.com](https://vercel.com)
3. 点击 "Add New" → "Project"
4. 选择刚推送的仓库
5. 在 "Environment Variables" 中添加：

| 变量名 | 值 |
|--------|-----|
| `FEISHU_APP_ID` | cli_aa9d04a592399cde |
| `FEISHU_APP_SECRET` | ROy8s96ufi6x4SpzzJ8KYcc1CvDWoyrU |
| `FEISHU_TARGET_OPEN_ID` | ou_465ccac71105378bd8a94677498e3a25 |

6. 点击 "Deploy"，等待部署完成
7. 部署成功后，访问分配的域名即可使用

### 方法二：Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录（会打开浏览器）
vercel login

# 部署
cd vercel-deploy
vercel --prod
```

部署时设置上述 3 个环境变量。

---

## 项目结构

```
vercel-deploy/
├── api/
│   └── submit.js        # 飞书消息推送 API（Serverless Function）
├── public/
│   └── index.html       # 前端页面（智能选配助手）
├── package.json
└── vercel.json
```

## 本地开发

```bash
cd vercel-deploy
npm run dev
```

## 注意事项

- 确保飞书应用 "塞缪尔" 已获取 `im:message` 权限
- 如果页面访问慢，考虑将静态资源部署在国内 CDN
