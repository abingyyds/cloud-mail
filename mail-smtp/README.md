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

## Railway 部署

建议在 Railway 创建两个 Service：

1. 主邮件系统 Service：配置 `SMTP_RELAY_HOST`、`SMTP_RELAY_PORT=587`、`SMTP_RELAY_SECURE=starttls` 和 `SMTP_RELAY_TOKEN`；
2. `mail-smtp` Service：Root Directory 设置为 `mail-smtp`，启动命令使用 `pnpm start`，配置 `SMMAILS_API_URL` 和相同的 `SMTP_RELAY_TOKEN`。

在 SMTP Relay Service 的 Networking 中开启 TCP Proxy。Railway 如果分配了独立的 TCP 代理地址和端口，产品内显示的 SMTP 服务器和端口应使用 Railway 提供的地址和端口，而不是固定写死 587。Railway 环境变量可以直接使用 `SMTP_TLS_KEY` 和 `SMTP_TLS_CERT` 保存 PEM 证书，也可以使用证书文件路径。

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
