# 部署指南（静态站点）

项目结构为纯静态站点：`index.html`、`gallery.html`、`faq.html` 等 + `css`/`js`/`assets`。

## 一键部署选项

### Netlify（推荐，拖拽即部署）
1. 登录 Netlify → Add new site → Deploy manually。
2. 选择整个 `image-to-3d-website` 文件夹上传（或上传 zip）。
3. 部署完成后可在 Site settings 绑定自定义域名，自动启用 HTTPS。

项目内已包含 `netlify.toml`，设置了发布目录为根与基础缓存策略。

### Vercel（Git 仓库托管）
1. 把项目推到 GitHub/GitLab。
2. 登录 Vercel → Import Project → 选择该仓库。
3. Root Directory 使用仓库根。部署完成后支持自定义域名与 HTTPS。

项目内已包含 `vercel.json`，用于静态页面部署与简洁 URL。

### GitHub Pages（免费）
1. 建立仓库并推送：
   - `git init && git add . && git commit -m "init"`
   - `git branch -M main && git remote add origin <repo-url> && git push -u origin main`
2. 仓库 Settings → Pages：Source 选 Branch `main`，Folder 选 `/root`。
3. 页面地址为 `https://<用户名>.github.io/<仓库名>/`。

如需自定义域名，仓库根添加 `CNAME` 文件，内容为你的域名。

## 自托管（Nginx）
1. 上传整个目录到服务器，例如 `/var/www/polly`。
2. Nginx 配置示例：
```
server {
  listen 80;
  server_name yourdomain.com;
  root /var/www/polly;
  index index.html;
  location / { try_files $uri $uri/ =404; }
}
```
3. `nginx -t && systemctl reload nginx`，并配置 HTTPS（Certbot/云厂商证书）。

## 打包上传（手动）
可将 `image-to-3d-website` 目录压缩为 zip，然后在 Netlify/Vercel 的手动部署中上传。

## 直连 HTTPS 后端（推荐用于生产）

前端已支持通过运行时配置直连后端的 `POST /generate` 接口：

- 配置方式（任选其一）：
  - 在 `index.html` 顶部添加脚本：
    - `<script>window.POLLY_API_BASE = 'https://api.yourdomain.com/';</script>`
  - 使用 URL 参数：访问 `https://your.site/?apiBase=https://api.yourdomain.com/`
  - 设置 meta 标签（已在页面中预置）：`<meta name="polly-api-base" content="https://api.yourdomain.com/">`

- 后端 CORS 要求：
  - 允许来源：`Access-Control-Allow-Origin: https://<你的.vercel.app>`（或你的自定义域名）
  - 允许方法：`Access-Control-Allow-Methods: POST, OPTIONS`
  - 允许头：`Access-Control-Allow-Headers: Content-Type, Accept`
  - 预检：对 `OPTIONS /generate` 返回 `200` 并带上以上 CORS 响应头

- 响应内容：
  - 返回 GLB 二进制：`Content-Type: model/gltf-binary`
  - 建议设置 `Content-Length` 和禁止缓存（或控制缓存）：`Cache-Control: no-store`

- 时长与可靠性：
  - 前端默认超时 5 分钟（可通过 URL `?timeout` 或全局 `window.POLLY_TIMEOUT_MS` 调整）
  - 建议后端使用异步任务 + 轮询接口，避免前端长时间连接超时

- 备用端点：
  - 如需在主后端不可用时回退，可设置 `window.POLLY_API_FALLBACK_BASE = 'https://backup.yourdomain.com/'`
  - 前端会在主请求失败后自动尝试一次备用端点

> 注意：如果 Vercel 项目开启了 Deployment Protection，请关闭生产环境的保护，或改为直连不受保护的后端域名。临时测试可使用 Vercel 的保护绕过密钥，但不建议在公开生产环境中使用。

## 使用同源代理连接后端（无需后端 HTTPS）

当你的后端仅支持 HTTP，且页面在 HTTPS 环境（如 Vercel）下需要“按上传图生成”，可以使用同源服务端代理：前端请求 `https://<your.vercel.app>/api/generate`，由该函数代理到你的后端。

### 配置步骤（Vercel Dashboard）
1. 登录 Vercel → 选择你的项目（例如 Polly）。
2. 打开项目 → Settings → Environment Variables。
3. 添加以下环境变量（Environment 推荐同时设置为 Production 与 Preview）：
   - `BACKEND_GENERATE_URL`：你的后端生成地址（例如 `http://111.229.71.58:8086/generate` 或 `https://api.yourdomain.com/generate`）。
   - 可选 `BACKEND_AUTHORIZATION`：后端需要的 Authorization 值（例如 `Bearer xxxxx`）。
   - 可选 `BACKEND_X_API_KEY`：如果后端使用 `x-api-key`。
   - 可选 `BACKEND_X_AUTH_TOKEN`：如果后端使用自定义 token 头。
4. 保存后重新部署（或触发一次 Redeploy），新部署将自动使用这些变量。

### CLI 方式（可选）
在项目根执行：

```
vercel env add BACKEND_GENERATE_URL production
vercel env add BACKEND_AUTHORIZATION production
vercel env add BACKEND_X_API_KEY production
vercel env add BACKEND_X_AUTH_TOKEN production
```

根据提示输入对应值；如需为 preview/staging 环境设置，命令中的环境改为 `preview`。

### 前端与代理行为说明
- 前端会向同源 `POST /api/generate` 发送真实图片与 `face_count`（字段名：`image_base64`）。
- 该同源函数会：
  - 读取上述环境变量，构造对你的后端的请求；
  - 自动转发浏览器请求中携带的常用鉴权头（`Authorization`、`x-api-key`、`x-auth-token`）；
  - 返回后端的 GLB 二进制，并设置 `Content-Type: model/gltf-binary`。

### 额外调试选项（临时）
- 你也可以通过前端 URL 参数临时传入鉴权：
  - `?authBearer=YOUR_TOKEN` → 请求头 `Authorization: Bearer YOUR_TOKEN`
  - `?apiKey=YOUR_API_KEY` → 请求头 `x-api-key: YOUR_API_KEY`
- 推荐在生产环境使用 Vercel 的环境变量，避免在 URL 暴露凭证。

### 验证
- 访问 `https://<your.vercel.app>/#converter` 上传图片生成。
- 在浏览器 Network 面板观察：
  - `Request URL`：`/api/generate`
  - `Request Payload`：`{"image_base64":"...","face_count":80000}`
  - 响应：`200 OK` 且 `Content-Type: model/gltf-binary`，页面展示 GLB。