# SMmails SMTP Relay

Cloudflare Workers 不能监听 TCP 587/465，因此本目录提供一个独立部署的 SMTP Relay。客户产品使用标准 SMTP 连接 Relay，Relay 完成账号密码认证、发件地址限制和邮件解析，然后调用当前 SMmails Worker 的 Open API 发信。

## 工作流

```text
客户产品 -- SMTP 587 + STARTTLS --> SMTP Relay -- HTTPS Open API --> SMmails Worker --> SMTP/Resend/Cloudflare Email
```

Relay 不保存或返回平台 SMTP 密码。每个 SMTP 账号绑定一个 SMmails API Key 和一个或多个已验证发件地址。

## 配置

```bash
cp .env.example .env
```

单账号可以使用：

```dotenv
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMMAILS_API_URL=https://mail.example.com
SMTP_USERNAME=product-a
SMTP_PASSWORD=use-a-long-random-password
SMMAILS_API_KEY=smm_xxx
SMTP_FROM_EMAIL=no-reply@example.com
```

多账号使用 `SMTP_USERS_JSON`，格式如下：

```dotenv
SMTP_USERS_JSON=[{"username":"product-a","password":"password-a","apiKey":"smm_xxx","fromEmail":"no-reply@example.com"},{"username":"product-b","password":"password-b","apiKey":"smm_yyy","fromEmails":["notice@example.com","support@example.com"]}]
```

SMTP 密码只保存在 Relay 的环境变量或 Secret 中，不要提交到 Git。`apiKey` 必须是 SMmails“开发者接入”中创建的 API Key，`fromEmail` 必须已验证。

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
