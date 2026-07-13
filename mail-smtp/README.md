# SMmails SMTP Relay

Cloudflare Workers 不能监听 TCP 587/465，因此本目录提供一个独立部署的 SMTP Relay。客户产品使用标准 SMTP 连接 Relay，Relay 完成账号密码认证、发件地址限制和邮件解析，然后调用当前 SMmails Worker 的 Open API 发信。

## 工作流

```text
客户产品 -- SMTP 587 + STARTTLS --> SMTP Relay -- HTTPS Open API --> SMmails Worker --> SMTP/Resend/Cloudflare Email
```

Relay 不保存或返回平台 SMTP 密码。默认情况下，客户在 SMmails 的“开发者接入”页面创建 SMTP 账号；每个 SMTP 账号绑定一个 SMmails API Key 和一个已验证发件地址，Relay 通过内部接口动态认证。

## 配置

```bash
cp .env.example .env
```

动态账号模式：

1. 在 SMmails 的“开发者接入”创建 API Key；
2. 添加并验证发信身份；
3. 创建 SMTP 账号，页面会显示一次 SMTP 密码；
4. 客户使用页面显示的 SMTP 服务器、端口、账号、密码和发件邮箱。

Relay 只需要配置平台地址和双方共享的 `SMTP_RELAY_TOKEN`，不需要为每个客户修改环境变量。

旧版单账号兼容模式可以使用：

```dotenv
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMMAILS_API_URL=https://mail.example.com
SMTP_RELAY_TOKEN=use-the-same-secret-in-the-mail-worker
SMTP_USERNAME=product-a
SMTP_PASSWORD=use-a-long-random-password
SMMAILS_API_KEY=smm_xxx
SMTP_FROM_EMAIL=no-reply@example.com
```

多账号静态兼容模式使用 `SMTP_USERS_JSON`，格式如下：

```dotenv
SMTP_USERS_JSON=[{"username":"product-a","password":"password-a","apiKey":"smm_xxx","fromEmail":"no-reply@example.com"},{"username":"product-b","password":"password-b","apiKey":"smm_yyy","fromEmails":["notice@example.com","support@example.com"]}]
```

动态模式下 SMTP 密码只在主系统创建时显示一次并以哈希形式保存，Relay 通过 HTTPS 临时接收认证信息；不要把密码提交到 Git。静态兼容模式中的 `apiKey` 必须是 SMmails“开发者接入”中创建的 API Key，`fromEmail` 必须已验证。

## TLS 和端口

- `587`：`SMTP_SECURE=false`，客户端使用 STARTTLS；
- `465`：`SMTP_SECURE=true`，使用隐式 TLS；
- `SMTP_REQUIRE_TLS=true` 时，未加密连接不能认证；
- 必须配置 `SMTP_TLS_KEY_PATH` 和 `SMTP_TLS_CERT_PATH`，并将证书挂载到容器；
- Cloudflare DNS 不能使用橙云代理 SMTP TCP 流量，Relay 域名应使用 DNS only，或使用能代理 TCP 的产品。

## 启动

```bash
pnpm install
pnpm start
```

生产环境建议使用 Docker、systemd 或 Kubernetes，并在防火墙只开放 587/465。

## 外部部署

主邮件系统通过 GitHub Actions 部署到 Cloudflare Workers；`mail-smtp` 必须单独部署到支持长期 TCP 监听的 VPS、Docker 主机、Kubernetes 或其他 TCP 服务平台。Cloudflare Workers 和 GitHub Actions 本身都不能长期监听 SMTP 的 587/465 端口。

在外部主机上运行 Relay：

1. 将 `SMMAILS_API_URL` 设置为 Cloudflare Worker 的 HTTPS 地址；
2. 设置与 Worker 部署使用的相同 `SMTP_RELAY_TOKEN`；
3. 对外开放 TCP 587（STARTTLS）或 465（隐式 TLS），并配置证书；
4. 将 Relay 的公网 DNS 主机名和端口填入 GitHub Actions 的 `SMTP_RELAY_HOST`、`SMTP_RELAY_PORT`，重新部署 Worker。

Relay 的 DNS 记录必须使用 DNS only，不能直接使用 Cloudflare 橙云代理普通 SMTP TCP 流量。GitHub Actions 只负责部署 Worker，不会替代这台外部 Relay 主机。

## Railway 部署

当前仓库已经包含 `Dockerfile` 和 `railway.toml`，可以把 `mail-smtp` 作为一个独立 Railway Service 部署。主系统仍然留在 Cloudflare Worker，Railway 只运行 SMTP Relay。

### 1. 创建 Railway Service

1. 在 Railway 创建项目，选择 **Deploy from GitHub Repo**，选择本仓库；
2. 在 Service 的 **Settings → Source** 将 Root Directory 设置为 `/mail-smtp`；
3. Railway 会使用 `mail-smtp/Dockerfile` 构建，不要把根目录设置成 `mail-worker`；
4. 部署前在 **Variables** 添加下面的变量。

```dotenv
SMTP_LISTEN_HOST=0.0.0.0
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_ALLOW_INSECURE_AUTH=false
SMTP_SERVER_NAME=smtp.smmails.com
SMMAILS_API_URL=https://cloud-mail.abingyyds.workers.dev
SMTP_RELAY_TOKEN=<与Cloudflare Worker相同的随机Token>
SMTP_TLS_KEY=<完整TLS私钥PEM，换行写成\n>
SMTP_TLS_CERT=<完整TLS证书PEM，换行写成\n>
```

Railway 使用变量传入证书时，不要设置 `SMTP_TLS_KEY_PATH` 或 `SMTP_TLS_CERT_PATH`；`SMTP_TLS_KEY` 和 `SMTP_TLS_CERT` 必须是一对，证书的域名应包含 `smtp.smmails.com`。不要把这些值提交到 Git。

### 2. 开启 TCP Proxy

部署成功后进入 Railway Service → **Networking → TCP Proxy**，为容器端口 `587` 创建 TCP Proxy。Railway 会显示一个公网主机和公网端口，例如：

```text
公网主机：containers-us-west-xxx.railway.app
公网端口：32567
```

客户实际使用 Railway 提供的公网端口，不一定是 587。随后在 GitHub 仓库 **Settings → Secrets and variables → Actions** 设置：

```text
SMTP_RELAY_HOST=containers-us-west-xxx.railway.app
SMTP_RELAY_PORT=32567
SMTP_RELAY_SECURE=starttls
SMTP_RELAY_TOKEN=<与Railway相同的Token>
```

`SMTP_RELAY_HOST` 不要填写 `cloud-mail.abingyyds.workers.dev`，也不要填写 `https://`。如果 Railway 支持为 TCP Proxy 绑定自定义域名，可以再将 `smtp.smmails.com` 按 Railway 提示绑定；否则先直接使用 Railway 提供的公网主机和端口。

### 3. 重新部署 Worker

修改 GitHub Variables/Secrets 后，手动运行 `.github/workflows/deploy-cloudflare.yml`。仅修改 GitHub Variables 不会自动触发当前的 push workflow。Worker 重新部署后，网站创建或重置 SMTP 账号时就会显示 Relay 的公网主机和端口。

### 4. 验证连接

从外部机器测试 TCP 端口：

```bash
nc -vz containers-us-west-xxx.railway.app 32567
```

再用支持 STARTTLS 的邮件客户端测试。客户配置使用 Railway 公网主机、公网端口、产品内生成的 SMTP 用户名和密码，安全方式选择 **STARTTLS**。

## 客户端配置

```text
SMTP server: smtp.example.com
SMTP port: 587
SMTP username: product-a
SMTP password: use-a-long-random-password
From: no-reply@example.com
Security: STARTTLS
```

Relay 会限制发件人只能使用该账号的 `fromEmail/fromEmails`，收件人数量和邮件大小也会受到配置限制。实际额度、日志和最终投递仍由 SMmails Open API 管理。
