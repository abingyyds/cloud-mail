<template>
  <div id="login-box" :style="background || ''" v-loading="oauthLoading" element-loading-text="登录中...">
    <div class="login-shell">
      <section class="login-story">
        <button class="brand" type="button" @click="router.push('/')">
          <SmLogo compact />
          <span>SMmails</span>
        </button>
        <div class="story-copy">
          <span class="story-badge">
            <Icon icon="lucide:bot" width="15" height="15" />
            Agent-driven mailbox
          </span>
          <h1>未来你的邮箱将由 Agent 驱动。</h1>
          <p>SmartMails 让邮箱活起来。重要邮件自动识别，回复草稿主动生成，跟进任务持续推进。</p>
        </div>
        <div class="agent-preview">
          <div class="preview-top">
            <span>Agent Brief</span>
            <strong>Today</strong>
          </div>
          <div class="brief-item active">
            <Icon icon="lucide:sparkles" width="18" height="18" />
            <div>
              <strong>8 封邮件需要行动</strong>
              <p>已按客户、财务、系统通知自动分组。</p>
            </div>
          </div>
          <div class="brief-item">
            <Icon icon="lucide:reply" width="18" height="18" />
            <div>
              <strong>3 份回复草稿</strong>
              <p>Agent 已引用历史邮件上下文。</p>
            </div>
          </div>
        </div>
      </section>

      <section class="form-wrapper">
        <div class="container">
          <div class="form-heading">
            <span class="form-kicker">{{ settingStore.settings.title || 'SmartMails' }}</span>
            <h2>{{ show === 'login' ? '进入 SMmails' : '创建 SMmails 账号' }}</h2>
            <p v-if="show === 'login'">{{ $t('loginTitle') }}</p>
            <p v-else>{{ $t('regTitle') }}</p>
          </div>

          <div v-show="show === 'login'" class="auth-form">
            <el-input :class="!hideLoginDomain ? 'email-input' : ''" v-model="form.email"
                      type="text" :placeholder="$t('emailAccount')" autocomplete="off">
              <template #append v-if="!hideLoginDomain">
                <div class="suffix-trigger" @click.stop="openSelect">
                  <el-select
                      v-if="show === 'login'"
                      ref="mySelect"
                      v-model="suffix"
                      :placeholder="$t('select')"
                      class="select"
                  >
                    <el-option
                        v-for="item in domainList"
                        :key="item"
                        :label="item"
                        :value="item"
                    />
                  </el-select>
                  <div>
                    <span>{{ suffix }}</span>
                    <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
                  </div>
                </div>
              </template>
            </el-input>
            <el-input v-model="form.password" :placeholder="$t('password')" type="password" autocomplete="off" />
            <el-button class="btn" type="primary" @click="submit" :loading="loginLoading">
              {{ $t('loginBtn') }}
            </el-button>
            <el-button class="btn oauth-btn" v-if="settingStore.settings.linuxdoSwitch" @click="linuxDoLogin">
              <el-avatar src="/image/linuxdo.webp" :size="18" style="margin-right: 10px" />LinuxDo
            </el-button>
          </div>

          <div v-show="show !== 'login'" class="auth-form">
            <el-input :class="!hideLoginDomain ? 'email-input' : ''" v-model="registerForm.email" type="text" :placeholder="$t('emailAccount')"
                      autocomplete="off">
              <template #append v-if="!hideLoginDomain">
                <div class="suffix-trigger" @click.stop="openSelect">
                  <el-select
                      v-if="show !== 'login'"
                      ref="mySelect"
                      v-model="suffix"
                      :placeholder="$t('select')"
                      class="select"
                  >
                    <el-option
                        v-for="item in domainList"
                        :key="item"
                        :label="item"
                        :value="item"
                    />
                  </el-select>
                  <div>
                    <span>{{ suffix }}</span>
                    <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
                  </div>
                </div>
              </template>
            </el-input>
            <el-input v-model="registerForm.password" :placeholder="$t('password')" type="password" autocomplete="off"/>
            <el-input v-model="registerForm.confirmPassword" :placeholder="$t('confirmPwd')" type="password"
                      autocomplete="off"/>
            <el-input v-if="settingStore.settings.regKey === 0" v-model="registerForm.code" :placeholder="$t('regKey')"
                      type="text" autocomplete="off"/>
            <el-input v-if="settingStore.settings.regKey === 2" v-model="registerForm.code"
                      :placeholder="$t('regKeyOptional')" type="text" autocomplete="off"/>
            <div v-show="verifyShow"
                 class="register-turnstile"
                 :data-sitekey="settingStore.settings.siteKey"
                 data-callback="onTurnstileSuccess"
                 data-error-callback="onTurnstileError"
                 data-after-interactive-callback="loadAfter"
                 data-before-interactive-callback="loadBefore"
            >
              <span style="font-size: 12px;color: #F56C6C" v-if="botJsError">{{ $t('verifyModuleFailed') }}</span>
            </div>
            <el-button class="btn" type="primary" @click="submitRegister" :loading="registerLoading">
              {{ $t('regBtn') }}
            </el-button>
            <el-button v-if="settingStore.settings.linuxdoSwitch" class="btn oauth-btn" @click="linuxDoLogin">
              <el-avatar src="/image/linuxdo.webp" :size="18" style="margin-right: 10px" />LinuxDo
            </el-button>
          </div>

          <template v-if="settingStore.settings.register === 0">
            <div class="switch" @click="show = 'register'" v-if="show === 'login'">{{ $t('noAccount') }}
              <span>{{ $t('regSwitch') }}</span></div>
            <div class="switch" @click="show = 'login'" v-else>{{ $t('hasAccount') }} <span>{{ $t('loginSwitch') }}</span>
            </div>
          </template>
        </div>
      </section>
    </div>

    <el-dialog class="bind-dialog" v-model="showBindForm" title="注册邮箱">
      <div class="bind-container">
        <el-input :class="!hideLoginDomain ? 'email-input' : ''" v-model="bindForm.email" type="text" :placeholder="$t('emailAccount')" autocomplete="off">
          <template #append v-if="!hideLoginDomain">
            <div class="suffix-trigger" @click.stop="openSelect">
              <el-select
                  ref="mySelect"
                  v-model="suffix"
                  :placeholder="$t('select')"
                  class="select"
              >
                <el-option
                    v-for="item in domainList"
                    :key="item"
                    :label="item"
                    :value="item"
                />
              </el-select>
              <div>
                <span>{{ suffix }}</span>
                <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
              </div>
            </div>
          </template>
        </el-input>
        <el-input v-if="settingStore.settings.regKey === 0" v-model="bindForm.code" :placeholder="$t('regKey')"
                  type="text" autocomplete="off"/>
        <el-input v-if="settingStore.settings.regKey === 2" v-model="bindForm.code"
                  :placeholder="$t('regKeyOptional')" type="text" autocomplete="off"/>
        <el-button class="btn" type="primary" @click="bind" :loading="bindLoading">绑定</el-button>
      </div>
    </el-dialog>
    <a v-show="settingStore.settings.projectLink" class="github" href="https://github.com/maillab/cloud-mail">
      <Icon icon="mingcute:github-line" width="20" height="20" />
    </a>
  </div>
</template>

<script setup>
import router from "@/router";
import {computed, nextTick, reactive, ref} from "vue";
import {login} from "@/request/login.js";
import {register} from "@/request/login.js";
import {websiteConfig} from "@/request/setting.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url} from "@/utils/convert.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import {useI18n} from "vue-i18n";
import {oauthBindUser, oauthLinuxDoLogin} from "@/request/ouath.js";
import SmLogo from "@/components/sm-logo/index.vue";

const {t} = useI18n();
const accountStore = useAccountStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const settingStore = useSettingStore();
const loginLoading = ref(false)
const bindLoading = ref(false)
const oauthLoading = ref(false);
const showBindForm = ref(false);
const show = ref('login')

const bindForm = reactive({
  email: '',
  oauthUserId: '',
  code: ''
})

const form = reactive({
  email: '',
  password: '',

});
const mySelect = ref()
const suffix = ref('')
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  code: null
})
const domainList = settingStore.domainList;
const registerLoading = ref(false)
suffix.value = domainList[0]
const verifyShow = ref(false)
let verifyToken = ''
let turnstileId = null
let botJsError = ref(false)
let verifyErrorCount = 0

window.onTurnstileSuccess = (token) => {
  verifyToken = token;
};

window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) {
    return
  }
  verifyErrorCount++
  console.warn('人机验加载失败', e)
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.register-turnstile')
      } else {
        window.turnstile.reset(turnstileId);
      }
    })
  }, 1500)
};

window.loadAfter = (e) => {
  console.log('loadAfter')
}

window.loadBefore = (e) => {
  console.log('loadBefore')
}

const loginOpacity = computed(() => {
  const opacity = settingStore.settings.loginOpacity
  return uiStore.dark ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`
})

const loginDarkenFactor = computed(() => {
  const factor = Number(settingStore.settings.loginDarkenFactor ?? 0)
  if (Number.isNaN(factor)) return 0
  return Math.min(1, Math.max(0, factor))
})

const hideLoginDomain = computed(() => settingStore.settings.loginDomain === 1)

const background = computed(() => {
  const bg = settingStore.settings.background
  if (!bg) return ''
  const bgUrl = cvtR2Url(bg)
  return {
    'background-image': `
      linear-gradient(rgba(0, 0, 0, ${loginDarkenFactor.value}), rgba(0, 0, 0, ${loginDarkenFactor.value})),
      url(${bgUrl})
    `,
    'background-repeat': 'no-repeat, no-repeat',
    'background-size': 'cover, cover',
    'background-position': 'center, center'
  }
})

const openSelect = () => {
  mySelect.value.toggleMenu()
}

const getFullEmail = (email) => {
  return hideLoginDomain.value ? email : email + suffix.value
}

const getEmailName = (email) => {
  return email.split('@')[0]
}

function linuxDoLogin() {
  const clientId = settingStore.settings.linuxdoClientId
  const redirectUri = encodeURIComponent(settingStore.settings.linuxdoCallbackUrl)
  window.location.href =
      `https://connect.linux.do/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email`
}

linuxDoGetUser();

async function linuxDoGetUser() {

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')

  if (code) {

    oauthLoading.value = true
    oauthLinuxDoLogin(code).then(data => {

      bindForm.oauthUserId = data.userInfo.oauthUserId;

      if (!data.token) {
        showBindForm.value = true
        oauthLoading.value = false
        ElMessage({
          message: '请注册绑定一个邮箱',
          type: 'warning',
          duration: 4000,
          plain: true,
        })
        return;
      }

      saveToken(data.token);
    }).catch(() => {
      oauthLoading.value = false
    })
  }

  const cleanUrl = window.location.origin + window.location.pathname
  window.history.replaceState({}, '', cleanUrl)
}

function bind() {

  if (!bindForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }


  if (getEmailName(bindForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(bindForm.email);


  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {

    if (!bindForm.code) {

      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }

  }

  const form = {email, oauthUserId: bindForm.oauthUserId, code: bindForm.code}

  bindLoading.value = true
  oauthBindUser(form).then(data => {
    saveToken(data.token)
  }).catch(() => {
    bindLoading.value = false
  })
}

const submit = () => {

  if (!form.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(form.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  loginLoading.value = true
  login(email, form.password).then(async data => {
    await saveToken(data.token)
  }).finally(() => {
    loginLoading.value = false
  })
}

async function saveToken(token) {
  localStorage.setItem('token', token)
  refreshWebsiteConfig()
  const user = await loginUserInfo();
  accountStore.currentAccountId = user.account.accountId;
  accountStore.currentAccount = user.account;
  userStore.user = user;
  const routers = permsToRouter(user.permKeys);
  routers.forEach(routerData => {
    router.addRoute('layout', routerData);
  });
  await router.replace({name: 'layout'})
  uiStore.showNotice()
  oauthLoading.value = false;
  bindLoading.value = false;
}

function refreshWebsiteConfig() {
  websiteConfig().then(setting => {
    settingStore.settings = setting
    settingStore.domainList = setting.domainList
    if (!suffix.value && setting.domainList.length > 0) {
      suffix.value = setting.domainList[0]
    }
    document.title = setting.title
  }).catch(e => {
    console.error(e)
  })
}


function submitRegister() {

  if (!registerForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  console.log(registerForm.email)

  if (getEmailName(registerForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  const email = getFullEmail(registerForm.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!registerForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {

    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {

    if (!registerForm.code) {

      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }

  }

  if (!verifyToken && (settingStore.settings.registerVerify === 0 || (settingStore.settings.registerVerify === 2 && settingStore.settings.regVerifyOpen))) {
    if (!verifyShow.value) {
      verifyShow.value = true
      nextTick(() => {
        if (!turnstileId) {
          try {
            turnstileId = window.turnstile.render('.register-turnstile')
          } catch (e) {
            botJsError.value = true
            console.log('人机验证js加载失败')
          }
        } else {
          window.turnstile.reset('.register-turnstile')
        }
      })
    } else if (!botJsError.value) {
      ElMessage({
        message: t('botVerifyMsg'),
        type: "error",
        plain: true
      })
    }
    return;
  }

  registerLoading.value = true

  const form = {
    email,
    password: registerForm.password,
    token: verifyToken,
    code: registerForm.code
  }

  register(form).then(({regVerifyOpen}) => {
    show.value = 'login'
    registerForm.email = ''
    registerForm.password = ''
    registerForm.confirmPassword = ''
    registerForm.code = ''
    registerLoading.value = false
    verifyToken = ''
    settingStore.settings.regVerifyOpen = regVerifyOpen
    verifyShow.value = false
    ElMessage({
      message: t('regSuccessMsg'),
      type: 'success',
      plain: true,
    })
  }).catch(res => {

    registerLoading.value = false

    if (res.code === 400) {
      verifyToken = ''
      settingStore.settings.regVerifyOpen = true
      if (turnstileId) {
        window.turnstile.reset(turnstileId)
      } else {
        nextTick(() => {
          turnstileId = window.turnstile.render('.register-turnstile')
        })
      }
      verifyShow.value = true

    }
  });
}

</script>


<style>
.el-select-dropdown__item {
  padding: 0 15px;
}

.no-autofill-pwd {
  .el-input__inner {
    -webkit-text-security: disc !important;
  }
}
</style>

<style lang="scss" scoped>
#login-box {
  min-height: 100%;
  background:
      radial-gradient(circle at 14% 12%, rgba(15, 118, 110, 0.15), transparent 30%),
      radial-gradient(circle at 86% 22%, rgba(67, 121, 238, 0.13), transparent 28%),
      linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  overflow: auto;
}

.login-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 46px;
  align-items: center;
  width: min(1120px, calc(100% - 36px));
  min-height: 100svh;
  margin: 0 auto;
  padding: 36px 0;
}

.login-story {
  display: grid;
  align-content: space-between;
  min-height: min(720px, calc(100svh - 72px));
}

.brand {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: var(--sm-foreground);
  cursor: pointer;
  font-weight: 720;
}

.story-copy {
  max-width: 620px;

  h1 {
    margin: 18px 0 18px;
    font-size: clamp(46px, 6vw, 78px);
    line-height: 0.96;
    letter-spacing: 0;
    font-weight: 780;
  }

  p {
    max-width: 540px;
    color: var(--sm-muted-foreground);
    font-size: 17px;
    line-height: 1.82;
  }
}

.story-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--sm-accent);
  background: var(--sm-accent-soft);
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 720;
}

.agent-preview {
  width: min(500px, 100%);
  margin-top: 32px;
  padding: 14px;
  border: 1px solid var(--sm-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--sm-shadow-sm);
  backdrop-filter: blur(16px);
}

.preview-top {
  display: flex;
  justify-content: space-between;
  color: var(--sm-muted-foreground);
  font-size: 12px;
  margin-bottom: 10px;

  strong {
    color: var(--sm-foreground);
  }
}

.brief-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  padding: 13px;
  border: 1px solid var(--sm-border);
  border-radius: 12px;
  background: var(--sm-card);
  margin-top: 8px;
  position: relative;
  overflow: hidden;

  svg {
    color: var(--sm-accent);
  }

  p {
    color: var(--sm-muted-foreground);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 3px;
  }
}

.brief-item.active {
  color: #fff;
  background: #111827;

  p,
  svg {
    color: rgba(255, 255, 255, 0.72);
  }
}

.brief-item.active::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0%, rgba(94, 234, 212, 0.16) 45%, transparent 72%);
  transform: translateX(-120%);
  animation: login-scan 4.8s ease-in-out infinite;
}

.form-wrapper {
  display: flex;
  justify-content: flex-end;
}

.container {
  width: 100%;
  background: color-mix(in srgb, var(--sm-card) 92%, transparent);
  border: 1px solid var(--sm-border);
  border-radius: 18px;
  padding: 26px;
  box-shadow: var(--sm-shadow-lg);
  backdrop-filter: blur(18px);

  .btn {
    height: 40px;
    width: 100%;
    border-radius: 8px;
    margin: 0;
  }

  .oauth-btn {
    margin-top: 10px;
  }

  .switch {
    margin-top: 20px;
    text-align: center;
    color: var(--sm-muted-foreground);

    span {
      color: var(--sm-foreground);
      cursor: pointer;
      font-weight: 720;
    }
  }

  .email-input :deep(.el-input__wrapper) {
    border-radius: 8px 0 0 8px;
  }

  .el-input {
    height: 40px;
    width: 100%;
    margin-bottom: 14px;

    :deep(.el-input__inner) {
      height: 38px;
    }
  }
}

.form-heading {
  display: grid;
  gap: 6px;
  margin-bottom: 22px;

  .form-kicker {
    color: var(--sm-accent);
    font-size: 12px;
    font-weight: 720;
  }

  h2 {
    font-size: 28px;
    line-height: 1.12;
    letter-spacing: 0;
  }

  p {
    color: var(--sm-muted-foreground);
  }
}

.auth-form {
  display: grid;
}

:deep(.el-select-dropdown__item) {
  padding: 0 10px;
}

:deep(.bind-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.bind-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.setting-icon {
  position: relative;
  top: 6px;
}

.suffix-trigger {
  display: flex;
  align-items: center;
  min-height: 38px;
  color: var(--sm-muted-foreground);

  > div:last-child {
    display: flex;
    align-items: center;
  }
}

.github {
  position: fixed;
  width: 35px;
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: var(--sm-card);
  bottom: 10px;
  right: 10px;
  z-index: 1000;
  color: var(--sm-foreground);
  border: 1px solid var(--sm-border);
  box-shadow: var(--sm-shadow-xs);
  cursor: pointer;
}

:deep(.el-input-group__append) {
  padding: 0 !important;
  padding-left: 8px !important;
  padding-right: 4px !important;
  background: var(--sm-card);
  border-radius: 0 8px 8px 0;
}

:deep(.el-button+.el-button) {
  margin: 0;
}

.register-turnstile {
  margin-bottom: 18px;
}

.select {
  position: absolute;
  right: 30px;
  width: 100px;
  opacity: 0;
  pointer-events: none;
}

.custom-style {
  margin-bottom: 10px;
}

.custom-style .el-segmented {
  --el-border-radius-base: 6px;
  width: 180px;
}

@media (max-width: 900px) {
  .login-shell {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .login-story {
    min-height: auto;
  }

  .agent-preview {
    display: none;
  }

  .form-wrapper {
    justify-content: stretch;
  }
}

@media (max-width: 560px) {
  .login-shell {
    width: calc(100% - 24px);
    padding: 24px 0;
  }

  .story-copy h1 {
    font-size: 42px;
  }

  .container {
    padding: 18px;
    border-radius: 14px;
  }
}

@keyframes login-scan {
  0%,
  38% {
    transform: translateX(-120%);
  }
  68%,
  100% {
    transform: translateX(120%);
  }
}

</style>
