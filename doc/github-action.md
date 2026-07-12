## Github Action 部署

**配置 Github 仓库**

1. Fork 或克隆仓库 [https://github.com/eoao/cloud-mail](https://github.com/eoao/cloud-mail)
2. 进入您的 GitHub 仓库设置
3. 转到 Settings → Secrets and variables → Actions → New Repository secrets
4. 添加以下 Secrets：

| Secret 名称             | 必需 | 用途                                                  |
| ----------------------- | :--: | ----------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  |  ✅  | Cloudflare API 令牌（需要 Workers 和相关资源权限）    |
| `CLOUDFLARE_ACCOUNT_ID` |  ✅  | Cloudflare 账户 ID                                    |
| `D1_DATABASE_ID`        |  ✅  | 您的 D1 数据库 UUID（不是数据库名称）；也可省略，让 workflow 按 `NAME` 自动查找或创建 |
| `D1_DATABASE_NAME`      |  ❌  | 已有 D1 数据库的精确名称；填写 `D1_DATABASE_ID` 时推荐同时填写 |
| `KV_NAMESPACE_ID`       |  ✅  | 您的 KV 命名空间的 ID                                   |
| `R2_BUCKET_NAME`        |  ✅  | 您的 R2 存储桶的名称                                    |
| `DOMAIN`                |  ✅  | 您要用于邮件服务的域名（例如 `["xx.xx"]，多域名用,分隔`）        |
| `ADMIN`                 |  ✅  | 您的管理员邮箱地址（例如 `admin@example.com`）      |
| `JWT_SECRET`            |  ✅  | 用于生成和验证 JWT 的随机长字符串                     |
| `NAME`                  |  ❌  | Worker 名称，建议固定，例如 `smmails`，避免换名后绑定到新资源 |
| `CUSTOM_DOMAIN`         |  ❌  | 自定义域名，例如 `mail.example.com`。配置后 workflow 会写入 route |
| `INIT_URL`              |  ❌  | （可选）部署后用于初始化数据库的 Worker URL（格式参考下述手动初始化）           |

---

**获取 Cloudflare API 令牌**

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. 创建新的 API 令牌
3. 选择"编辑 Cloudflare Workers"模板，并确保令牌同时拥有对应资源权限：Workers Scripts 编辑、Workers Routes 编辑、D1 编辑/读取、KV 编辑；如果启用 R2，再添加 R2 Storage 编辑。
   ![dc2e1dc8dcd217644759c46c6c705de1](https://i.miji.bid/2025/07/07/dc2e1dc8dcd217644759c46c6c705de1.png)
4. 保存令牌并复制到 GitHub Secrets 中的 `CLOUDFLARE_API_TOKEN`

**获取 Cloudflare 账户 ID**
1. 账户 ID 可以在 Cloudflare 仪表盘的账户设置中找到。
2. 复制到 GitHub Secrets 中的 `CLOUDFLARE_ACCOUNT_ID`

**运行工作流**
1. 然后在Action页面手动运行工作流，后续同步上游后会自动部署到 Cloudflare Workers。如未配置 `INIT_URL`，则需要手动访问 `https://你的项目域名/api/init/你的jwt_secret` 进行数据库初始化。
2. 自动同步上游可使用bot或者手动点击Sync Upstream按钮。

**避免 push 后重新配置**

Cloudflare/Wrangler 部署会把仓库里的配置当作 Worker 配置来源。建议把 D1、KV、R2、自定义域名和运行变量都放到 GitHub Secrets / Variables 中，让 workflow 每次部署都生成同一份 `wrangler-action.toml`。

当前 workflow 已开启 `keep_vars = true` 和 `wrangler deploy --keep-vars`，可以保留 Cloudflare 控制台中额外添加的环境变量。但资源绑定（D1/KV/R2）和 routes 仍建议通过 Secrets / Variables 固定，否则下一次 push 可能和控制台手动配置不一致。

如果你同时开启了 Cloudflare 控制台的 Git 集成部署和 GitHub Actions 部署，建议只保留一种部署入口，避免两个来源互相覆盖配置。详细说明见 [Cloudflare 持久化部署说明](./cloudflare-persistent-deploy.md)。
