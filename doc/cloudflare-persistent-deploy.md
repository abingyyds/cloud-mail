# Cloudflare 持久化部署说明

如果你在 Cloudflare 控制台里手动配置了环境变量、绑定或自定义域名，但每次 `push` 后又要重新配置，根因通常是：Wrangler/GitHub Action 部署时会把仓库里的配置当作 source of truth，并覆盖控制台里的 Worker 配置。

本仓库推荐使用 `.github/workflows/deploy-cloudflare.yml` 自动部署，并把 Cloudflare 配置放到 GitHub Secrets / Variables 中，而不是每次在 Cloudflare 控制台手动改。

## 必填配置

进入 GitHub 仓库：

`Settings -> Secrets and variables -> Actions`

至少配置这些 Secrets 或 Variables：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DOMAIN`，格式示例：`["example.com"]`
- `ADMIN`，格式示例：`admin@example.com`
- `JWT_SECRET`

推荐固定这些资源，避免每次自动创建或绑定错资源：

- `NAME`，Worker 名称，例如：`smmails`
- `CUSTOM_DOMAIN`，例如：`mail.example.com`
- `D1_DATABASE_ID`
- `KV_NAMESPACE_ID`
- `R2_BUCKET_NAME`

可选：

- `PROJECT_LINK`
- `AI_MODEL`
- `ANALYSIS_CACHE`
- `CF_EMAIL`
- `LINUXDO_CLIENT_ID`
- `LINUXDO_CLIENT_SECRET`
- `LINUXDO_CALLBACK_URL`
- `LINUXDO_SWITCH`

## 重要规则

- 不要把 `JWT_SECRET`、OAuth secret、API token 写进 `wrangler.toml` 并提交。
- D1、KV、R2 绑定应通过 GitHub Secrets / Variables 注入到 `wrangler-action.toml`。
- 如果你在 Cloudflare 控制台临时增加变量，当前 workflow 已使用 `keep_vars = true` 和 `--keep-vars`，会保留控制台变量。
- 但是 D1/KV/R2 绑定、自定义域名这类资源配置仍建议写入 GitHub Secrets / Variables，否则下一次部署可能和你手动配置的不一致。
- 如果你同时开启了 Cloudflare 控制台的 Git 集成部署和 GitHub Actions 部署，建议只保留一种。推荐保留 GitHub Actions，避免两个部署源互相覆盖。

## 推送后仍然丢配置时检查

1. 确认 GitHub Actions 里 `NAME` 是同一个 Worker 名称。
2. 确认 `CUSTOM_DOMAIN` 已配置，否则 workflow 会移除 action 配置中的 routes。
3. 确认 `D1_DATABASE_ID`、`KV_NAMESPACE_ID`、`R2_BUCKET_NAME` 指向你正在使用的资源。
4. 确认 Cloudflare 控制台没有另一个 Pages/Workers Git 部署也在同一分支自动发布。
