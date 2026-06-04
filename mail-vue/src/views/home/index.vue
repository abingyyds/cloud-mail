<template>
  <main class="home-shell">
    <div class="intro-overlay" aria-hidden="true">
      <SmLogo />
      <span>SMmails</span>
    </div>
    <nav class="home-nav">
      <button class="brand" type="button" @click="goHome">
        <SmLogo compact />
        <span>SMmails</span>
      </button>
      <div class="nav-links">
        <a href="#agent">Agent</a>
        <a href="#workspace">Workspace</a>
        <a href="#security">Security</a>
      </div>
      <button class="nav-action" type="button" @click="enterApp">
        <Icon icon="lucide:arrow-up-right" width="16" height="16" />
        <span>进入工作台</span>
      </button>
    </nav>

    <section class="hero-section">
      <div class="hero-copy">
        <div class="eyebrow">
          <Icon icon="lucide:sparkles" width="16" height="16" />
          <span>New generation Agent-driven email</span>
        </div>
        <h1>SmartMails，让你的邮箱活起来。</h1>
        <p>
          SMmails 将收件、归档、回复、跟进和知识提取交给 Agent 协同处理。
          未来你的邮箱不是消息堆栈，而是能理解上下文、主动推进工作的智能工作台。
        </p>
        <div class="hero-actions">
          <button class="primary-action" type="button" @click="enterApp">
            <span>打开智能邮箱</span>
            <Icon icon="lucide:arrow-right" width="17" height="17" />
          </button>
          <a class="secondary-action" href="#workspace">
            <Icon icon="lucide:panel-left" width="17" height="17" />
            <span>查看内部界面</span>
          </a>
        </div>
      </div>

      <div class="hero-product" aria-label="SMmails product preview">
        <div class="ambient-ring ring-a"></div>
        <div class="ambient-ring ring-b"></div>
        <div class="product-topbar">
          <div class="window-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="product-search">
            <Icon icon="lucide:search" width="15" height="15" />
            <span>Ask Agent: 帮我总结今天的重要邮件</span>
          </div>
        </div>
        <div class="product-grid">
          <aside class="product-sidebar">
            <div class="sidebar-logo">
              <SmLogo compact />
              <strong>SmartMails</strong>
            </div>
            <button v-for="item in sidebarItems" :key="item.label" :class="{ active: item.active }" type="button">
              <Icon :icon="item.icon" width="17" height="17" />
              <span>{{ item.label }}</span>
              <em v-if="item.count">{{ item.count }}</em>
            </button>
          </aside>
          <section class="product-inbox">
            <div class="inbox-header">
              <div>
                <span>Priority Inbox</span>
                <strong>Agent 已标记 8 封需要行动的邮件</strong>
              </div>
              <button type="button">
                <Icon icon="lucide:wand-sparkles" width="16" height="16" />
                Agent Run
              </button>
            </div>
            <div class="mail-list">
              <article v-for="mail in mails" :key="mail.title" class="mail-card" :style="{ '--delay': mail.delay }">
                <span class="scan-line"></span>
                <div class="mail-avatar">{{ mail.avatar }}</div>
                <div class="mail-body">
                  <div class="mail-meta">
                    <strong>{{ mail.sender }}</strong>
                    <span>{{ mail.time }}</span>
                  </div>
                  <h3>{{ mail.title }}</h3>
                  <p>{{ mail.desc }}</p>
                </div>
                <div class="mail-signal">{{ mail.signal }}</div>
              </article>
            </div>
          </section>
          <aside class="agent-panel">
            <div class="agent-card active">
              <Icon icon="lucide:brain-circuit" width="20" height="20" />
              <strong>Agent Brief</strong>
              <p>识别 3 个客户机会、2 个风险提醒，并自动生成回复草稿。</p>
            </div>
            <div class="agent-card">
              <Icon icon="lucide:calendar-check" width="20" height="20" />
              <strong>Follow-up Queue</strong>
              <p>明天 10:00 前提醒销售、财务和技术支持同步状态。</p>
            </div>
            <div class="agent-draft">
              <div class="draft-title">
                <Icon icon="lucide:pen-line" width="17" height="17" />
                <span>Live Draft</span>
              </div>
              <p><span class="typing-text">您好，关于企业版采购流程，我已整理报价与安全材料...</span></p>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section id="agent" class="feature-band">
      <div class="section-heading">
        <span>Agent native</span>
        <h2>从“收邮件”升级为“邮件驱动任务”。</h2>
      </div>
      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card">
          <Icon :icon="feature.icon" width="22" height="22" />
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
        </article>
      </div>
    </section>

    <section id="workspace" class="workspace-section">
      <div class="workspace-copy">
        <span>Inside SMmails</span>
        <h2>邮箱内部是一个真正的工作台。</h2>
        <p>
          侧栏承载账号与权限，中心区域用于高密度邮件扫描，右侧/弹层处理写信、回复、附件和 Agent 建议。
          视觉上采用 coss 的低噪声组件语言，让长时间处理邮件也保持清晰。
        </p>
      </div>
      <div class="workspace-metrics">
        <div v-for="metric in metrics" :key="metric.label">
          <strong>{{ metric.value }}</strong>
          <span>{{ metric.label }}</span>
        </div>
      </div>
    </section>

    <section id="security" class="security-section">
      <div>
        <span>Built for future mail</span>
        <h2>多账号、权限、审计和智能处理，一起设计。</h2>
      </div>
      <button class="primary-action compact" type="button" @click="enterApp">
        <span>开始使用 SMmails</span>
        <Icon icon="lucide:arrow-right" width="17" height="17" />
      </button>
    </section>
  </main>
</template>

<script setup>
import { Icon } from "@iconify/vue";
import router from "@/router";
import SmLogo from "@/components/sm-logo/index.vue";

const sidebarItems = [
  { label: "Inbox", icon: "lucide:inbox", count: 24, active: true },
  { label: "Agent Briefs", icon: "lucide:bot", count: 8 },
  { label: "Follow-ups", icon: "lucide:clock-3", count: 5 },
  { label: "Knowledge", icon: "lucide:book-open", count: 0 },
];

const mails = [
  {
    avatar: "A",
    sender: "Atlas AI",
    time: "09:42",
    title: "Enterprise plan procurement thread",
    desc: "Agent 建议：合并 4 封往来，生成报价回复，并提醒法务审核条款。",
    signal: "High",
    delay: "0s",
  },
  {
    avatar: "N",
    sender: "Nova Labs",
    time: "10:16",
    title: "Security questionnaire follow-up",
    desc: "自动定位历史答案，已准备 SOC2、数据保留和 DPA 回复片段。",
    signal: "Draft",
    delay: "0.9s",
  },
  {
    avatar: "F",
    sender: "Finance",
    time: "11:05",
    title: "Invoice mismatch detected",
    desc: "Agent 发现发票金额与合同不一致，已标注风险并等待确认。",
    signal: "Risk",
    delay: "1.8s",
  },
];

const features = [
  {
    icon: "lucide:brain",
    title: "上下文理解",
    desc: "识别邮件线程中的人、项目、合同、时间和承诺事项。",
  },
  {
    icon: "lucide:messages-square",
    title: "自动草稿",
    desc: "根据历史口吻和业务信息生成可编辑回复，而不是模板拼接。",
  },
  {
    icon: "lucide:route",
    title: "主动推进",
    desc: "把邮件转化为跟进、提醒、分派和知识沉淀。",
  },
];

const metrics = [
  { value: "3x", label: "更快处理高优先级邮件" },
  { value: "24/7", label: "Agent 持续整理收件箱" },
  { value: "0", label: "减少遗漏关键回复" },
];

function enterApp() {
  router.push(localStorage.getItem("token") ? "/inbox" : "/login");
}

function goHome() {
  router.push("/");
}
</script>

<style scoped lang="scss">
.home-shell {
  min-height: 100%;
  color: var(--sm-foreground);
  background:
    radial-gradient(circle at 12% 8%, rgba(67, 121, 238, 0.12), transparent 30%),
    radial-gradient(circle at 88% 20%, rgba(20, 184, 166, 0.13), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 42%, #f7f8fa 100%);
  overflow-x: hidden;
}

.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #f8fafc;
  background: #020617;
  font-size: 18px;
  font-weight: 760;
  pointer-events: none;
  animation: intro-exit 1.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;

  :deep(.sm-logo) {
    width: 48px;
    height: 48px;
  }
}

.home-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;
  width: min(1180px, calc(100% - 36px));
  min-height: 68px;
  margin: 0 auto;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
  animation: reveal-down 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
}

.brand,
.nav-action,
.primary-action,
.secondary-action,
.product-inbox button,
.product-sidebar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 650;
}

.brand {
  color: var(--sm-foreground);
  background: transparent;
  font-size: 15px;
}

.nav-links {
  display: flex;
  justify-content: center;
  gap: 10px;

  a {
    color: var(--sm-muted-foreground);
    text-decoration: none;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
  }

  a:hover {
    color: var(--sm-foreground);
    background: rgba(15, 23, 42, 0.05);
  }
}

.nav-action,
.secondary-action {
  min-height: 36px;
  padding: 0 13px;
  color: var(--sm-foreground);
  background: rgba(255, 255, 255, 0.76);
  border-color: rgba(15, 23, 42, 0.1);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.nav-action:hover,
.secondary-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(620px, 1.18fr);
  align-items: center;
  gap: 46px;
  width: min(1180px, calc(100% - 36px));
  min-height: calc(100svh - 68px);
  margin: 0 auto;
  padding: 54px 0 76px;
}

.hero-copy {
  max-width: 560px;
  animation: reveal-up 0.86s cubic-bezier(0.22, 1, 0.36, 1) 0.72s both;

  h1 {
    margin: 18px 0 18px;
    font-size: clamp(48px, 6vw, 76px);
    line-height: 0.95;
    letter-spacing: 0;
    font-weight: 780;
  }

  p {
    max-width: 520px;
    color: var(--sm-muted-foreground);
    font-size: 17px;
    line-height: 1.82;
  }
}

.eyebrow,
.section-heading span,
.workspace-copy span,
.security-section span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0f766e;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.22);
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 700;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.primary-action {
  min-height: 42px;
  padding: 0 16px;
  color: #fff;
  background: #111827;
  border-color: #111827;
  box-shadow: 0 18px 35px rgba(15, 23, 42, 0.18);
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.primary-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.22);
}

.primary-action.compact {
  min-height: 38px;
}

.hero-product {
  position: relative;
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 36px 90px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  animation: product-float 6s ease-in-out infinite, reveal-scale 0.92s cubic-bezier(0.22, 1, 0.36, 1) 0.9s both;
}

.ambient-ring {
  position: absolute;
  z-index: 0;
  border: 1px solid rgba(20, 184, 166, 0.18);
  border-radius: 50%;
  pointer-events: none;
}

.ring-a {
  width: 320px;
  height: 320px;
  right: -150px;
  top: -150px;
  animation: ring-pulse 5.2s ease-in-out infinite;
}

.ring-b {
  width: 220px;
  height: 220px;
  left: 42%;
  bottom: -120px;
  border-color: rgba(59, 130, 246, 0.18);
  animation: ring-pulse 5.2s ease-in-out 1.1s infinite;
}

.product-topbar {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 16px;
  min-height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(248, 250, 252, 0.78);
}

.window-dots {
  display: flex;
  gap: 6px;

  span {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #cbd5e1;
  }
}

.product-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: min(460px, 100%);
  height: 32px;
  padding: 0 11px;
  color: #64748b;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  font-size: 12px;
  animation: search-glow 4.8s ease-in-out infinite;

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.product-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr) 210px;
  min-height: 520px;
}

.product-sidebar,
.agent-panel {
  padding: 14px;
  background: #f8fafc;
}

.product-sidebar {
  border-right: 1px solid rgba(15, 23, 42, 0.08);

  button {
    width: 100%;
    min-height: 34px;
    margin-top: 6px;
    padding: 0 10px;
    justify-content: flex-start;
    color: #64748b;
    background: transparent;
    font-size: 13px;

    em {
      margin-left: auto;
      font-style: normal;
      font-size: 11px;
    }
  }

  button.active {
    color: #0f172a;
    background: #fff;
    border-color: rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 16px;
  font-size: 13px;
}

.product-inbox {
  padding: 18px;
  background: #fff;
}

.inbox-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 14px;

  div {
    display: grid;
    gap: 3px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }

  strong {
    font-size: 15px;
  }

  button {
    min-height: 34px;
    padding: 0 12px;
    color: #0f172a;
    background: #f8fafc;
    border-color: rgba(15, 23, 42, 0.08);
    font-size: 12px;
  }
}

.mail-list {
  display: grid;
  gap: 10px;
}

.mail-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: start;
  padding: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  overflow: hidden;
  animation: mail-lift 5.4s ease-in-out var(--delay) infinite;
}

.scan-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -34%;
  width: 34%;
  background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.14), transparent);
  transform: skewX(-16deg);
  animation: scan-mail 4.8s ease-in-out var(--delay) infinite;
  pointer-events: none;
}

.mail-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: #0f172a;
  background: #eef2f7;
  font-weight: 750;
}

.mail-body {
  min-width: 0;

  h3 {
    margin: 4px 0;
    font-size: 14px;
  }

  p {
    color: #64748b;
    font-size: 12px;
    line-height: 1.65;
  }
}

.mail-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: #64748b;
  font-size: 12px;

  strong {
    color: #334155;
  }
}

.mail-signal {
  padding: 4px 7px;
  border-radius: 999px;
  color: #0f766e;
  background: rgba(20, 184, 166, 0.12);
  font-size: 11px;
  font-weight: 700;
}

.agent-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-left: 1px solid rgba(15, 23, 42, 0.08);
}

.agent-card {
  display: grid;
  gap: 8px;
  padding: 13px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: #fff;

  svg {
    color: #0f766e;
  }

  strong {
    font-size: 13px;
  }

  p {
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }
}

.agent-card.active {
  background: #111827;
  color: #fff;

  p,
  svg {
    color: rgba(255, 255, 255, 0.72);
  }
}

.agent-draft {
  display: grid;
  gap: 10px;
  padding: 13px;
  border: 1px solid rgba(20, 184, 166, 0.18);
  border-radius: 12px;
  background: rgba(20, 184, 166, 0.08);

  p {
    min-height: 54px;
    color: #475569;
    font-size: 12px;
    line-height: 1.65;
  }
}

.draft-title {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 720;
}

.typing-text {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  border-right: 1px solid #0f766e;
  animation: typing 5.8s steps(32, end) infinite, caret 0.85s step-end infinite;
}

.feature-band,
.workspace-section,
.security-section {
  width: min(1180px, calc(100% - 36px));
  margin: 0 auto;
}

.feature-band {
  padding: 30px 0 70px;
}

.section-heading {
  display: grid;
  gap: 14px;
  max-width: 690px;

  h2 {
    font-size: clamp(32px, 4vw, 52px);
    line-height: 1.05;
    letter-spacing: 0;
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 28px;
}

.feature-card {
  display: grid;
  gap: 12px;
  padding: 22px;
  min-height: 190px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;

  svg {
    color: #0f766e;
  }

  h3 {
    font-size: 17px;
  }

  p {
    color: var(--sm-muted-foreground);
    line-height: 1.75;
  }
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgba(15, 23, 42, 0.14);
  box-shadow: 0 14px 38px rgba(15, 23, 42, 0.08);
}

.workspace-section {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 30px;
  align-items: end;
  padding: 54px 0;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.workspace-copy {
  max-width: 700px;

  h2 {
    margin: 14px 0;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 1.08;
  }

  p {
    color: var(--sm-muted-foreground);
    line-height: 1.8;
  }
}

.workspace-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(110px, 1fr));
  gap: 10px;

  div {
    display: grid;
    gap: 6px;
    min-width: 120px;
    padding: 16px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.68);
  }

  strong {
    font-size: 28px;
  }

  span {
    color: var(--sm-muted-foreground);
    font-size: 12px;
  }
}

.security-section {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  padding: 38px 0 58px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);

  h2 {
    margin-top: 12px;
    font-size: clamp(28px, 4vw, 44px);
    line-height: 1.08;
  }
}

@media (max-width: 1080px) {
  .hero-section {
    grid-template-columns: 1fr;
  }

  .hero-product {
    width: 100%;
  }

  .product-grid {
    grid-template-columns: 170px minmax(0, 1fr);
  }

  .agent-panel {
    display: none;
  }

  .workspace-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .home-nav {
    width: calc(100% - 24px);
    grid-template-columns: 1fr auto;
  }

  .nav-links {
    display: none;
  }

  .nav-action span {
    display: none;
  }

  .hero-section,
  .feature-band,
  .workspace-section,
  .security-section {
    width: calc(100% - 24px);
  }

  .hero-section {
    min-height: auto;
    padding-top: 40px;
  }

  .hero-copy h1 {
    font-size: 46px;
  }

  .product-grid {
    grid-template-columns: 1fr;
  }

  .product-sidebar {
    display: none;
  }

  .inbox-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .mail-card {
    grid-template-columns: auto 1fr;
  }

  .mail-signal {
    grid-column: 2;
    width: fit-content;
  }

  .feature-grid,
  .workspace-metrics {
    grid-template-columns: 1fr;
  }

  .security-section {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intro-overlay,
  .home-nav,
  .hero-copy,
  .hero-product,
  .ambient-ring,
  .product-search,
  .mail-card,
  .scan-line,
  .typing-text {
    animation: none !important;
  }

  .intro-overlay {
    display: none;
  }
}

@keyframes intro-exit {
  0% {
    opacity: 1;
    clip-path: circle(150% at 50% 50%);
  }
  58% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    clip-path: circle(0% at 50% 50%);
    visibility: hidden;
  }
}

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes reveal-down {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes reveal-scale {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes product-float {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -8px;
  }
}

@keyframes ring-pulse {
  0%,
  100% {
    scale: 0.88;
    opacity: 0.18;
  }
  50% {
    scale: 1.08;
    opacity: 0.54;
  }
}

@keyframes search-glow {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(20, 184, 166, 0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.09);
  }
}

@keyframes mail-lift {
  0%,
  100% {
    transform: translateX(0);
  }
  46%,
  58% {
    transform: translateX(4px);
  }
}

@keyframes scan-mail {
  0%,
  36% {
    left: -36%;
    opacity: 0;
  }
  44% {
    opacity: 1;
  }
  68% {
    left: 106%;
    opacity: 0;
  }
  100% {
    left: 106%;
    opacity: 0;
  }
}

@keyframes typing {
  0%,
  12% {
    width: 0;
  }
  48%,
  78% {
    width: 100%;
  }
  100% {
    width: 0;
  }
}

@keyframes caret {
  50% {
    border-color: transparent;
  }
}
</style>
