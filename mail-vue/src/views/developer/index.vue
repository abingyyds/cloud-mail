<template>
  <div class="developer-page">
    <div class="overview">
      <div class="metric">
        <span>{{ $t('apiKey') }}</span>
        <strong>{{ overview.apiKeyCount || 0 }}</strong>
      </div>
      <div class="metric">
        <span>{{ $t('senderIdentity') }}</span>
        <strong>{{ overview.senderCount || 0 }}</strong>
      </div>
      <div class="metric">
        <span>{{ $t('apiSendLogs') }}</span>
        <strong>{{ overview.apiLogCount || 0 }}</strong>
      </div>
      <div class="metric">
        <span>{{ $t('customerQuota') }}</span>
        <strong>{{ formatQuota(overview.quota) }}</strong>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="developer-tabs" @tab-change="handleTabChange">
      <el-tab-pane :label="$t('apiKey')" name="keys">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>{{ $t('apiKey') }}</h2>
              <p>{{ $t('copyApiKeyWarning') }}</p>
            </div>
            <el-button type="primary" @click="apiKeyDialog = true">
              <Icon icon="fluent:key-20-regular"/>
              {{ $t('createApiKey') }}
            </el-button>
          </div>

          <el-table :data="apiKeys" v-loading="loading">
            <el-table-column prop="name" :label="$t('apiKeyName')" min-width="150"/>
            <el-table-column prop="keyPrefix" label="Prefix" min-width="130"/>
            <el-table-column :label="$t('quotaUsage')" min-width="220">
              <template #default="{row}">
                <div class="quota-lines">
                  <span>{{ $t('daily') }}: {{ formatUsage(row.dayUsed, row.dayLimit) }}</span>
                  <span>{{ $t('monthly') }}: {{ formatUsage(row.monthUsed, row.monthLimit) }}</span>
                  <span>{{ $t('total') }}: {{ formatUsage(row.totalUsed, row.totalLimit) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="lastUseTime" :label="$t('activeTime')" min-width="170"/>
            <el-table-column prop="createTime" :label="$t('createTime')" min-width="170"/>
            <el-table-column :label="$t('action')" width="220" fixed="right">
              <template #default="{row}">
                <el-switch :model-value="row.status" :active-value="0" :inactive-value="1"
                           @change="setApiKeyStatus(row, $event)"/>
                <el-button link type="primary" @click="openQuotaDialog(row)">
                  {{ $t('quota') }}
                </el-button>
                <el-button link type="danger" @click="removeApiKey(row.apiKeyId)">
                  {{ $t('delete') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane :label="$t('senderIdentity')" name="senders">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>{{ $t('senderIdentity') }}</h2>
              <p>{{ $t('dnsVerifyTip') }} {{ $t('smtpCustomSenderTip') }}</p>
            </div>
            <el-button type="primary" @click="senderDialog = true">
              <Icon icon="fluent:mail-add-20-regular"/>
              {{ $t('addSenderIdentity') }}
            </el-button>
          </div>

          <el-table :data="senders" v-loading="loading">
            <el-table-column prop="name" :label="$t('senderName')" min-width="140"/>
            <el-table-column prop="email" :label="$t('senderEmail')" min-width="220"/>
            <el-table-column :label="$t('type')" min-width="130">
              <template #default="{row}">
                {{ row.type === 'platform' ? $t('platformSender') : $t('customSender') }}
              </template>
            </el-table-column>
            <el-table-column :label="$t('status')" min-width="130">
              <template #default="{row}">
                <el-tag :type="row.verifyStatus === 0 ? 'success' : 'warning'">
                  {{ row.verifyStatus === 0 ? $t('verified') : $t('pendingVerify') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('externalDelivery')" min-width="170">
              <template #default="{row}">
                <el-tag :type="resendStatusType(row)">
                  {{ resendStatusLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('dnsRecord')" min-width="300">
              <template #default="{row}">
                <div v-if="row.type === 'custom'" class="dns-record">
                  <span>{{ row.dnsHost }}</span>
                  <el-button link type="primary" @click="copy(row.dnsHost)">
                    {{ $t('copy') }}
                  </el-button>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="TXT Value" min-width="300">
              <template #default="{row}">
                <div v-if="row.type === 'custom'" class="dns-record">
                  <span>{{ row.dnsValue }}</span>
                  <el-button link type="primary" @click="copy(row.dnsValue)">
                    {{ $t('copy') }}
                  </el-button>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column :label="$t('action')" width="420" fixed="right">
              <template #default="{row}">
                <el-switch :model-value="row.status" :active-value="0" :inactive-value="1"
                           @change="setSenderStatus(row, $event)"/>
                <el-button v-if="row.verifyStatus !== 0" link type="primary" @click="verifySender(row)">
                  {{ $t('verifyNow') }}
                </el-button>
                <el-button v-if="row.type === 'custom'" link type="primary" @click="openResendOnboarding(row)">
                  {{ $t('resendOnboarding') }}
                </el-button>
                <el-button v-if="canConfigureSmtp(row)" link type="primary" @click="provisionSenderSmtp(row)">
                  {{ $t('smtpService') }}
                </el-button>
                <el-button link type="danger" @click="removeSender(row.senderIdentityId)">
                  {{ $t('delete') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane :label="$t('smtpAccount')" name="smtp">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>{{ $t('smtpAccount') }}</h2>
              <p>{{ $t('smtpAccountDesc') }}</p>
            </div>
            <el-button type="primary" @click="smtpDialog = true">
              <Icon icon="fluent:mail-settings-20-regular"/>
              {{ $t('createSmtpAccount') }}
            </el-button>
          </div>

          <el-alert v-if="overview.smtp && !overview.smtp.configured" :title="$t('smtpRelayNotConfigured')" type="warning" :closable="false"/>

          <el-table :data="smtpAccounts" v-loading="loading">
            <el-table-column prop="name" :label="$t('smtpAccountName')" min-width="150"/>
            <el-table-column prop="username" :label="$t('smtpUsername')" min-width="180"/>
            <el-table-column prop="senderEmail" :label="$t('senderEmail')" min-width="220"/>
            <el-table-column :label="$t('smtpServer')" min-width="190">
              <template #default="{row}">
                <span>{{ row.smtpServer || '-' }}:{{ row.smtpPort }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="$t('status')" min-width="120">
              <template #default="{row}">
                <el-tag :type="row.status === 0 ? 'success' : 'info'">
                  {{ row.status === 0 ? $t('enabled') : $t('disabled') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastUseTime" :label="$t('activeTime')" min-width="180"/>
            <el-table-column :label="$t('action')" width="280" fixed="right">
              <template #default="{row}">
                <el-switch :model-value="row.status" :active-value="0" :inactive-value="1"
                           @change="setSmtpAccountStatus(row, $event)"/>
                <el-button link type="primary" @click="resetSmtpPassword(row)">
                  {{ $t('resetSmtpPassword') }}
                </el-button>
                <el-button link type="danger" @click="removeSmtpAccount(row.smtpAccountId)">
                  {{ $t('delete') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane :label="$t('apiSendLogs')" name="logs">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>{{ $t('apiSendLogs') }}</h2>
              <p>{{ $t('apiLogsDesc') }}</p>
            </div>
            <div class="log-filters">
              <el-select v-model="logParams.apiKeyId" clearable :placeholder="$t('apiKey')" style="width: 220px" @change="reloadLogs">
                <el-option v-for="item in apiKeys" :key="item.apiKeyId"
                           :label="`${item.name} (${item.keyPrefix})`" :value="item.apiKeyId"/>
              </el-select>
              <el-select v-model="logParams.mailType" clearable :placeholder="$t('mailType')" style="width: 160px" @change="reloadLogs">
                <el-option v-for="item in mailTypeOptions" :key="item.value"
                           :label="item.label" :value="item.value"/>
              </el-select>
            </div>
          </div>

          <el-table :data="logs" v-loading="logLoading">
            <el-table-column prop="emailId" label="Email ID" min-width="100"/>
            <el-table-column prop="apiKeyName" :label="$t('apiKey')" min-width="150"/>
            <el-table-column prop="from" :label="$t('senderEmail')" min-width="220"/>
            <el-table-column :label="$t('recipient')" min-width="240">
              <template #default="{row}">
                <span>{{ row.to.join(', ') }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="$t('mailType')" min-width="120">
              <template #default="{row}">
                <el-tag>{{ mailTypeLabel(row.mailType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="subject" :label="$t('subject')" min-width="220" :show-overflow-tooltip="true"/>
            <el-table-column prop="code" :label="$t('verificationCode')" min-width="130"/>
            <el-table-column :label="$t('status')" min-width="120">
              <template #default="{row}">
                <el-tag :type="statusTagType(row.statusText)">
                  {{ row.statusText }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" :label="$t('createTime')" min-width="170"/>
          </el-table>

          <div class="pagination" v-if="logTotal > logParams.size">
            <el-pagination
                v-model:current-page="logParams.num"
                v-model:page-size="logParams.size"
                :page-sizes="[10, 20, 50]"
                layout="prev, pager, next, sizes, total"
                :total="logTotal"
                @current-change="loadLogs"
                @size-change="loadLogs"/>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane :label="$t('apiDocs')" name="docs">
        <section class="section docs-section">
          <div class="section-head">
            <div>
              <h2>{{ $t('apiDocs') }}</h2>
              <p>{{ $t('apiDocsDesc') }}</p>
            </div>
          </div>

          <div class="doc-grid">
            <div class="doc-block">
              <h3>{{ $t('sendCodeExample') }}</h3>
              <pre><code>{{ codeExample }}</code></pre>
            </div>
            <div class="doc-block">
              <h3>{{ $t('jsExample') }}</h3>
              <pre><code>{{ jsExample }}</code></pre>
            </div>
            <div class="doc-block">
              <h3>{{ $t('statusQuery') }}</h3>
              <pre><code>{{ statusExample }}</code></pre>
            </div>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="apiKeyDialog" :title="$t('createApiKey')" width="420px" @closed="resetApiKeyForm">
      <el-form label-position="top">
        <el-form-item :label="$t('apiKeyName')">
          <el-input v-model="apiKeyForm.name" :placeholder="$t('apiKeyName')"/>
        </el-form-item>
        <div class="limit-grid">
          <el-form-item :label="$t('dailyLimit')">
            <el-input-number v-model="apiKeyForm.dayLimit" :min="0" :max="99999999" controls-position="right"/>
          </el-form-item>
          <el-form-item :label="$t('monthlyLimit')">
            <el-input-number v-model="apiKeyForm.monthLimit" :min="0" :max="99999999" controls-position="right"/>
          </el-form-item>
          <el-form-item :label="$t('totalLimit')">
            <el-input-number v-model="apiKeyForm.totalLimit" :min="0" :max="99999999" controls-position="right"/>
          </el-form-item>
        </div>
      </el-form>
      <el-button type="primary" style="width: 100%;" :loading="loading" @click="createKey">
        {{ $t('confirm') }}
      </el-button>
    </el-dialog>

    <el-dialog v-model="quotaDialog" :title="$t('quota')" width="420px" @closed="resetQuotaForm">
      <el-form label-position="top">
        <el-form-item :label="$t('dailyLimit')">
          <el-input-number v-model="quotaForm.dayLimit" :min="0" :max="99999999" controls-position="right"/>
        </el-form-item>
        <el-form-item :label="$t('monthlyLimit')">
          <el-input-number v-model="quotaForm.monthLimit" :min="0" :max="99999999" controls-position="right"/>
        </el-form-item>
        <el-form-item :label="$t('totalLimit')">
          <el-input-number v-model="quotaForm.totalLimit" :min="0" :max="99999999" controls-position="right"/>
        </el-form-item>
      </el-form>
      <el-button type="primary" style="width: 100%;" :loading="loading" @click="saveQuota">
        {{ $t('confirm') }}
      </el-button>
    </el-dialog>

    <el-dialog v-model="createdKeyDialog" :title="$t('apiKey')" width="560px">
      <el-alert :title="$t('copyApiKeyWarning')" type="warning" :closable="false"/>
      <el-input class="secret-input" v-model="createdKey" readonly>
        <template #append>
          <el-button @click="copy(createdKey)">{{ $t('copy') }}</el-button>
        </template>
      </el-input>
    </el-dialog>

    <el-dialog v-model="senderDialog" :title="$t('addSenderIdentity')" width="420px" @closed="resetSenderForm">
      <el-form label-position="top">
        <el-form-item :label="$t('senderEmail')">
          <el-input v-model="senderForm.email" :placeholder="$t('senderEmail')"/>
        </el-form-item>
        <el-form-item :label="$t('senderName')">
          <el-input v-model="senderForm.name" :placeholder="$t('senderName')"/>
        </el-form-item>
      </el-form>
      <el-button type="primary" style="width: 100%;" :loading="loading" @click="createSender">
        {{ $t('confirm') }}
      </el-button>
    </el-dialog>

    <el-dialog v-model="resendDialog" :title="$t('resendOnboardingTitle')" width="720px" @closed="resetResendForm">
      <template v-if="resendSender">
        <el-steps :active="resendActiveStep" finish-status="success" align-center class="resend-steps">
          <el-step :title="$t('resendStepOwnership')"/>
          <el-step :title="$t('resendStepAccount')"/>
          <el-step :title="$t('resendStepBind')"/>
          <el-step :title="$t('resendStepTest')"/>
        </el-steps>

        <el-alert v-if="['ban', 'internal'].includes(overview.quota?.sendType)"
                  :title="$t('resendQuotaBlocked')" type="warning" :closable="false" show-icon class="resend-quota-alert"/>

        <div class="resend-guide">
          <article class="resend-guide-card">
            <div class="resend-guide-title">
              <strong>1. {{ $t('resendStepOwnership') }}</strong>
              <el-tag :type="resendSender.verifyStatus === 0 ? 'success' : 'warning'">
                {{ resendSender.verifyStatus === 0 ? $t('verified') : $t('pendingVerify') }}
              </el-tag>
            </div>
            <p>{{ $t('resendOwnershipDesc') }}</p>
            <div class="resend-dns-grid">
              <span>{{ $t('dnsRecord') }}</span>
              <code>{{ resendSender.dnsHost }}</code>
              <el-button link type="primary" @click="copy(resendSender.dnsHost)">{{ $t('copy') }}</el-button>
              <span>TXT Value</span>
              <code>{{ resendSender.dnsValue }}</code>
              <el-button link type="primary" @click="copy(resendSender.dnsValue)">{{ $t('copy') }}</el-button>
            </div>
            <el-button v-if="resendSender.verifyStatus !== 0" type="primary" plain @click="verifySender(resendSender)">
              {{ $t('verifyNow') }}
            </el-button>
          </article>

          <article class="resend-guide-card">
            <div class="resend-guide-title">
              <strong>2. {{ $t('resendStepAccount') }}</strong>
            </div>
            <ol>
              <li>{{ $t('resendGuideAddDomain', {domain: resendSender.domain}) }}</li>
              <li>{{ $t('resendGuideDns') }}</li>
              <li>{{ $t('resendGuideCreateKey') }}</li>
              <li>{{ $t('resendGuideKeyScope', {domain: resendSender.domain}) }}</li>
            </ol>
            <div class="resend-links">
              <el-link href="https://resend.com/domains" target="_blank" type="primary">Resend Domains ↗</el-link>
              <el-link href="https://resend.com/api-keys" target="_blank" type="primary">Resend API Keys ↗</el-link>
              <el-link href="https://resend.com/docs/dashboard/domains/introduction" target="_blank" type="primary">{{ $t('officialDocs') }} ↗</el-link>
            </div>
          </article>

          <article class="resend-guide-card">
            <div class="resend-guide-title">
              <strong>3. {{ $t('resendStepBind') }}</strong>
              <el-tag v-if="resendSender.resendConfigured" type="success">
                {{ resendSender.resendTokenMasked }}
              </el-tag>
            </div>
            <p>{{ $t('resendBindDesc') }}</p>
            <div class="resend-inline-form">
              <el-input v-model="resendForm.token" type="password" show-password
                        :placeholder="$t('resendApiKeyPlaceholder')"/>
              <el-button type="primary" :loading="resendLoading"
                         :disabled="resendSender.verifyStatus !== 0 || !resendForm.token"
                         @click="bindResendToken">
                {{ resendSender.resendConfigured ? $t('replaceResendKey') : $t('bindResendKey') }}
              </el-button>
            </div>
            <el-alert :title="$t('resendSecurityTip')" type="info" :closable="false" show-icon/>
          </article>

          <article class="resend-guide-card">
            <div class="resend-guide-title">
              <strong>4. {{ $t('resendStepTest') }}</strong>
              <el-tag :type="resendStatusType(resendSender)">{{ resendStatusLabel(resendSender) }}</el-tag>
            </div>
            <p>{{ $t('resendTestDesc') }}</p>
            <div class="resend-inline-form">
              <el-input v-model="resendForm.recipient" :placeholder="$t('resendTestRecipient')"/>
              <el-button type="primary" :loading="resendLoading"
                         :disabled="!resendSender.resendConfigured || !resendForm.recipient || ['ban', 'internal'].includes(overview.quota?.sendType)"
                         @click="testResendDelivery">
                {{ $t('sendResendTest') }}
              </el-button>
            </div>
            <el-alert v-if="resendSender.resendLastError" :title="resendSender.resendLastError"
                      type="error" :closable="false" show-icon/>
            <p v-if="resendSender.resendLastCheckTime" class="resend-check-time">
              {{ $t('lastCheckTime') }}: {{ resendSender.resendLastCheckTime }}
            </p>
          </article>
        </div>

        <div class="resend-dialog-actions">
          <el-button v-if="resendSender.resendConfigured" type="danger" plain :loading="resendLoading" @click="removeResendToken">
            {{ $t('removeResendKey') }}
          </el-button>
          <el-button v-if="canConfigureSmtp(resendSender)" type="primary" @click="provisionSenderSmtp(resendSender)">
            {{ $t('resendReadyConfigureSmtp') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="smtpDialog" :title="$t('createSmtpAccount')" width="460px" @closed="resetSmtpForm">
      <el-form label-position="top">
        <el-form-item :label="$t('smtpAccountName')">
          <el-input v-model="smtpForm.name" :placeholder="$t('smtpAccountNamePlaceholder')"/>
        </el-form-item>
        <el-form-item :label="$t('smtpUsername')">
          <el-input v-model="smtpForm.username" :placeholder="$t('smtpUsernamePlaceholder')"/>
        </el-form-item>
        <el-form-item :label="$t('apiKey')">
          <el-select v-model="smtpForm.apiKeyId" style="width: 100%" :placeholder="$t('selectApiKey')">
            <el-option v-for="item in apiKeys" :key="item.apiKeyId" :label="`${item.name} (${item.keyPrefix})`" :value="item.apiKeyId"/>
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('senderIdentity')">
          <el-select v-model="smtpForm.senderIdentityId" style="width: 100%" :placeholder="$t('selectSenderIdentity')">
            <el-option v-for="item in verifiedSenders" :key="item.senderIdentityId" :label="`${item.name || '-'} <${item.email}>`" :value="item.senderIdentityId"/>
          </el-select>
        </el-form-item>
      </el-form>
      <el-button type="primary" style="width: 100%;" :loading="loading" @click="createSmtpAccount">
        {{ $t('confirm') }}
      </el-button>
    </el-dialog>

    <el-dialog v-model="createdSmtpDialog" :title="$t('smtpCredentials')" width="560px">
      <el-alert :title="$t('smtpPasswordOnceWarning')" type="warning" :closable="false"/>
      <div class="smtp-credential-grid">
        <span>{{ $t('smtpServer') }}</span><strong>{{ createdSmtp.account?.smtpServer || '-' }}</strong>
        <span>{{ $t('smtpPort') }}</span><strong>{{ createdSmtp.account?.smtpPort || 587 }}</strong>
        <span>{{ $t('smtpUsername') }}</span><strong>{{ createdSmtp.account?.username }}</strong>
        <span>{{ $t('smtpPassword') }}</span><strong>{{ createdSmtp.password }}</strong>
        <span>{{ $t('senderEmail') }}</span><strong>{{ createdSmtp.account?.senderEmail }}</strong>
        <span>{{ $t('smtpSecure') }}</span><strong>{{ createdSmtp.account?.smtpSecure === 'tls' ? 'SSL/TLS' : 'STARTTLS' }}</strong>
      </div>
      <el-button type="primary" style="width: 100%; margin-top: 16px" @click="copySmtpCredentials">
        {{ $t('copy') }}
      </el-button>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref} from 'vue';
import {
  apiKeyCreate,
  apiKeyDelete,
  apiKeyList,
  apiKeyQuota,
  apiKeyStatus,
  openLogs,
  openOverview,
  senderCreate,
  senderDelete,
  senderList,
  senderResendBind,
  senderResendDelete,
  senderResendTest,
  senderStatus,
  senderVerify,
  smtpAccountCreate,
  smtpAccountDelete,
  smtpAccountList,
  smtpAccountStatus,
  smtpAccountResetPassword,
  smtpAccountProvisionSender
} from '@/request/open-api.js';
import {ElMessage, ElMessageBox} from 'element-plus';
import {useI18n} from 'vue-i18n';
import {Icon} from '@iconify/vue';

defineOptions({name: 'developer'});

const {t} = useI18n();
const activeTab = ref('keys');
const loading = ref(false);
const logLoading = ref(false);
const overview = ref({});
const apiKeys = ref([]);
const senders = ref([]);
const smtpAccounts = ref([]);
const logs = ref([]);
const logTotal = ref(0);
const apiKeyDialog = ref(false);
const createdKeyDialog = ref(false);
const quotaDialog = ref(false);
const senderDialog = ref(false);
const resendDialog = ref(false);
const smtpDialog = ref(false);
const createdSmtpDialog = ref(false);
const createdKey = ref('');
const createdSmtp = ref({});
const resendLoading = ref(false);
const resendSender = ref(null);
const apiKeyForm = reactive({
  name: '',
  dayLimit: 0,
  monthLimit: 0,
  totalLimit: 0
});
const quotaForm = reactive({
  apiKeyId: 0,
  dayLimit: 0,
  monthLimit: 0,
  totalLimit: 0
});
const senderForm = reactive({
  email: '',
  name: ''
});
const resendForm = reactive({
  token: '',
  recipient: ''
});
const smtpForm = reactive({
  name: '',
  username: '',
  apiKeyId: '',
  senderIdentityId: ''
});
const logParams = reactive({
  num: 1,
  size: 20,
  apiKeyId: '',
  mailType: ''
});

const mailTypeOptions = computed(() => [
  {label: t('mailTypeCode'), value: 'code'},
  {label: t('mailTypeNotice'), value: 'notice'},
  {label: t('mailTypeAuto'), value: 'auto'},
  {label: t('mailTypeNormal'), value: 'normal'}
]);

const selectedSenderEmail = computed(() => {
  return senders.value.find(item => item.verifyStatus === 0 && item.status === 0)?.email || 'no-reply@example.com';
});

const verifiedSenders = computed(() => senders.value.filter(item => canConfigureSmtp(item)));

const resendActiveStep = computed(() => {
  const row = resendSender.value;
  if (!row || row.verifyStatus !== 0) return 0;
  if (!row.resendConfigured) return 1;
  if (!row.resendReady) return 2;
  return 4;
});

const codeExample = computed(() => {
  return `curl -X POST ${location.origin}/api/open/sendCode \\
  -H "Authorization: Bearer smm_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromEmail": "${selectedSenderEmail.value}",
    "to": "user@example.com",
    "productName": "Example App",
    "purpose": "登录",
    "expireMinutes": 10
  }'`;
});

const jsExample = computed(() => {
  return `await fetch("${location.origin}/api/open/sendNotice", {
  method: "POST",
  headers: {
    "Authorization": "Bearer smm_xxx",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    fromEmail: "${selectedSenderEmail.value}",
    to: "user@example.com",
    productName: "Example App",
    title: "订单已支付",
    body: "你的订单已经支付成功。"
  })
});`;
});

const statusExample = computed(() => {
  return `curl -X POST ${location.origin}/api/open/sendStatus \\
  -H "Authorization: Bearer smm_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"emailIds":[10001,10002]}'`;
});

onMounted(loadData);

function loadData() {
  loading.value = true;
  Promise.all([openOverview(), apiKeyList(), senderList(), smtpAccountList()])
      .then(([overviewData, keys, identities, accounts]) => {
        overview.value = overviewData || {};
        apiKeys.value = keys || [];
        senders.value = identities || [];
        smtpAccounts.value = accounts || [];
        if (activeTab.value === 'logs') {
          loadLogs();
        }
      })
      .finally(() => {
        loading.value = false;
      });
}

function handleTabChange(tab) {
  if (tab === 'logs') {
    loadLogs();
  }
}

function loadLogs() {
  logLoading.value = true;
  openLogs(logParams)
      .then(data => {
        logs.value = data.list || [];
        logTotal.value = data.total || 0;
      })
      .finally(() => {
        logLoading.value = false;
      });
}

function reloadLogs() {
  logParams.num = 1;
  loadLogs();
}

function createKey() {
  loading.value = true;
  apiKeyCreate({...apiKeyForm})
      .then(row => {
        createdKey.value = row.key;
        createdKeyDialog.value = true;
        apiKeyDialog.value = false;
        loadData();
      })
      .finally(() => {
        loading.value = false;
      });
}

function setApiKeyStatus(row, status) {
  apiKeyStatus(row.apiKeyId, status).then(loadData);
}

function openQuotaDialog(row) {
  quotaForm.apiKeyId = row.apiKeyId;
  quotaForm.dayLimit = row.dayLimit;
  quotaForm.monthLimit = row.monthLimit;
  quotaForm.totalLimit = row.totalLimit;
  quotaDialog.value = true;
}

function saveQuota() {
  loading.value = true;
  apiKeyQuota({...quotaForm})
      .then(() => {
        quotaDialog.value = false;
        loadData();
      })
      .finally(() => {
        loading.value = false;
      });
}

function removeApiKey(apiKeyId) {
  ElMessageBox.confirm(t('delConfirm', {msg: 'API Key'})).then(() => {
    apiKeyDelete(apiKeyId).then(loadData);
  });
}

function createSender() {
  loading.value = true;
  senderCreate({...senderForm})
      .then(() => {
        senderDialog.value = false;
        loadData();
      })
      .finally(() => {
        loading.value = false;
      });
}

function setSenderStatus(row, status) {
  senderStatus(row.senderIdentityId, status).then(loadData);
}

function verifySender(row) {
  senderVerify(row.senderIdentityId).then(() => {
    row.verifyStatus = 0;
    if (resendSender.value?.senderIdentityId === row.senderIdentityId) {
      resendSender.value = {...resendSender.value, verifyStatus: 0};
    }
    loadData();
  });
}

function canConfigureSmtp(row) {
  if (!row || row.verifyStatus !== 0 || row.status !== 0) return false;
  if (row.type === 'custom' && ['ban', 'internal'].includes(overview.value.quota?.sendType)) return false;
  return row.type === 'platform' || row.resendReady;
}

function resendStatusType(row) {
  if (row?.type === 'platform' || row?.resendReady) return 'success';
  if (row?.resendStatus === 'failed') return 'danger';
  if (row?.resendConfigured) return 'warning';
  return 'info';
}

function resendStatusLabel(row) {
  if (row?.type === 'platform') return t('platformManagedDelivery');
  if (row?.resendReady) return t('resendReady');
  if (row?.resendStatus === 'failed') return t('resendTestFailed');
  if (row?.resendConfigured) return t('resendPendingTest');
  return t('resendNotConfigured');
}

function openResendOnboarding(row) {
  resendSender.value = {...row};
  resendForm.token = '';
  resendForm.recipient = '';
  resendDialog.value = true;
}

function updateResendSender(row) {
  if (!row) return;
  resendSender.value = {...row};
  const index = senders.value.findIndex(item => item.senderIdentityId === row.senderIdentityId);
  if (index >= 0) {
    senders.value[index] = {...row};
  }
}

function bindResendToken() {
  if (!resendSender.value || !resendForm.token) return;
  resendLoading.value = true;
  senderResendBind(resendSender.value.senderIdentityId, resendForm.token)
      .then(row => {
        updateResendSender(row);
        resendForm.token = '';
        ElMessage({message: t('resendKeySaved'), type: 'success'});
      })
      .finally(() => {
        resendLoading.value = false;
      });
}

function testResendDelivery() {
  if (!resendSender.value || !resendForm.recipient) return;
  resendLoading.value = true;
  senderResendTest(resendSender.value.senderIdentityId, resendForm.recipient)
      .then(data => {
        updateResendSender(data.sender);
        ElMessage({message: t('resendTestSent', {email: data.recipient}), type: 'success'});
      })
      .finally(() => {
        resendLoading.value = false;
      });
}

function removeResendToken() {
  if (!resendSender.value) return;
  ElMessageBox.confirm(t('removeResendConfirm')).then(() => {
    resendLoading.value = true;
    senderResendDelete(resendSender.value.senderIdentityId)
        .then(() => {
          updateResendSender({
            ...resendSender.value,
            resendConfigured: false,
            resendTokenMasked: '',
            resendStatus: 'not_configured',
            resendReady: false,
            resendLastCheckTime: null,
            resendLastError: ''
          });
          loadData();
          ElMessage({message: t('resendRemoved'), type: 'success'});
        })
        .finally(() => {
          resendLoading.value = false;
        });
  });
}

function resetResendForm() {
  resendSender.value = null;
  resendForm.token = '';
  resendForm.recipient = '';
}

function removeSender(senderIdentityId) {
  ElMessageBox.confirm(t('delConfirm', {msg: t('senderIdentity')})).then(() => {
    senderDelete(senderIdentityId).then(loadData);
  });
}

function createSmtpAccount() {
  loading.value = true;
  smtpAccountCreate({...smtpForm})
      .then(data => {
        createdSmtp.value = data || {};
        createdSmtpDialog.value = true;
        smtpDialog.value = false;
        loadData();
      })
      .finally(() => {
        loading.value = false;
      });
}

function setSmtpAccountStatus(row, status) {
  smtpAccountStatus(row.smtpAccountId, status).then(loadData);
}

function removeSmtpAccount(smtpAccountId) {
  ElMessageBox.confirm(t('delConfirm', {msg: t('smtpAccount')})).then(() => {
    smtpAccountDelete(smtpAccountId).then(loadData);
  });
}

function resetSmtpPassword(row) {
  ElMessageBox.confirm(t('resetSmtpPasswordConfirm')).then(() => {
    loading.value = true;
    smtpAccountResetPassword(row.smtpAccountId)
        .then(data => {
          createdSmtp.value = data || {};
          createdSmtpDialog.value = true;
          loadData();
        })
        .finally(() => {
          loading.value = false;
        });
  });
}

function provisionSenderSmtp(row) {
  if (!canConfigureSmtp(row)) {
    openResendOnboarding(row);
    return;
  }
  smtpAccountProvisionSender(row.senderIdentityId, `SMTP ${row.email}`)
      .then(data => {
        createdSmtp.value = data || {};
        resendDialog.value = false;
        createdSmtpDialog.value = true;
        loadData();
      });
}

function resetApiKeyForm() {
  apiKeyForm.name = '';
  apiKeyForm.dayLimit = 0;
  apiKeyForm.monthLimit = 0;
  apiKeyForm.totalLimit = 0;
}

function resetQuotaForm() {
  quotaForm.apiKeyId = 0;
  quotaForm.dayLimit = 0;
  quotaForm.monthLimit = 0;
  quotaForm.totalLimit = 0;
}

function resetSenderForm() {
  senderForm.email = '';
  senderForm.name = '';
}

function resetSmtpForm() {
  smtpForm.name = '';
  smtpForm.username = '';
  smtpForm.apiKeyId = '';
  smtpForm.senderIdentityId = '';
}

function copySmtpCredentials() {
  const account = createdSmtp.value.account || {};
  const text = [
    `${t('smtpServer')}: ${account.smtpServer || ''}`,
    `${t('smtpPort')}: ${account.smtpPort || 587}`,
    `${t('smtpUsername')}: ${account.username || ''}`,
    `${t('smtpPassword')}: ${createdSmtp.value.password || ''}`,
    `${t('senderEmail')}: ${account.senderEmail || ''}`,
    `${t('smtpSecure')}: ${account.smtpSecure === 'tls' ? 'SSL/TLS' : 'STARTTLS'}`
  ].join('\n');
  copy(text);
}

function formatUsage(used, limit) {
  if (!limit) {
    return `${used || 0}/${t('unlimited')}`;
  }
  return `${used || 0}/${limit}`;
}

function formatQuota(quota) {
  if (quota?.sendType === 'ban') {
    return t('sendBanned');
  }
  if (quota?.sendType === 'internal') {
    return t('sendInternal');
  }
  if (!quota || quota.remaining === null) {
    return `${quota?.used || 0}/${t('unlimited')}`;
  }
  return `${quota.used}/${quota.limit}`;
}

function statusTagType(statusText) {
  if (['delivered', 'sent'].includes(statusText)) return 'success';
  if (['bounced', 'complained', 'failed'].includes(statusText)) return 'danger';
  return 'warning';
}

function mailTypeLabel(type) {
  const map = {
    code: t('mailTypeCode'),
    notice: t('mailTypeNotice'),
    auto: t('mailTypeAuto'),
    normal: t('mailTypeNormal')
  };
  return map[type] || t('unknown');
}

function copy(value) {
  navigator.clipboard.writeText(value || '').then(() => {
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true
    });
  });
}
</script>

<style scoped lang="scss">
.developer-page {
  height: 100%;
  overflow: auto;
  padding: 18px;
  background: var(--extra-light-fill);
}

.overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.metric {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--sm-border);
  border-radius: 8px;
  background: var(--sm-card);
  box-shadow: var(--sm-shadow-xs);

  span {
    display: block;
    color: var(--sm-muted-foreground);
    font-size: 12px;
    line-height: 18px;
  }

  strong {
    display: block;
    overflow: hidden;
    margin-top: 4px;
    color: var(--sm-foreground);
    font-size: 22px;
    line-height: 30px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.developer-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
}

.section {
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid var(--sm-border);
  border-radius: 8px;
  background: var(--sm-card);
  box-shadow: var(--sm-shadow-xs);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 16px;
    line-height: 24px;
  }

  p {
    margin: 4px 0 0;
    color: var(--sm-muted-foreground);
    font-size: 13px;
  }

  .el-button {
    gap: 6px;
  }
}

.quota-lines {
  display: grid;
  gap: 2px;
  color: var(--sm-muted-foreground);
  font-size: 12px;
  line-height: 18px;
}

.dns-record {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.log-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.doc-grid {
  display: grid;
  gap: 14px;
}

.doc-block {
  min-width: 0;

  h3 {
    margin: 0 0 8px;
    font-size: 14px;
    line-height: 22px;
  }
}

pre {
  overflow: auto;
  margin: 0;
  padding: 14px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  line-height: 1.6;
}

.secret-input {
  margin-top: 14px;
}

.smtp-credential-grid {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px 14px;
  margin-top: 16px;
  padding: 14px;
  border-radius: 8px;
  background: var(--sm-muted);

  span {
    color: var(--sm-muted-foreground);
  }

  strong {
    overflow-wrap: anywhere;
    color: var(--sm-foreground);
  }
}

.resend-steps {
  margin-bottom: 20px;
}

.resend-quota-alert {
  margin-bottom: 12px;
}

.resend-guide {
  display: grid;
  gap: 12px;
  max-height: 58vh;
  overflow: auto;
  padding-right: 4px;
}

.resend-guide-card {
  padding: 14px;
  border: 1px solid var(--sm-border);
  border-radius: 8px;
  background: var(--sm-card);

  p {
    margin: 8px 0 12px;
    color: var(--sm-muted-foreground);
    font-size: 13px;
    line-height: 1.6;
  }

  ol {
    margin: 8px 0 12px;
    padding-left: 20px;
    color: var(--sm-muted-foreground);
    font-size: 13px;
    line-height: 1.8;
  }
}

.resend-guide-title,
.resend-dialog-actions,
.resend-links,
.resend-inline-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.resend-guide-title,
.resend-dialog-actions {
  justify-content: space-between;
}

.resend-links {
  flex-wrap: wrap;
}

.resend-inline-form {
  margin-bottom: 12px;

  .el-button {
    flex: none;
  }
}

.resend-dns-grid {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  span {
    color: var(--sm-muted-foreground);
    font-size: 12px;
  }

  code {
    overflow: hidden;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--sm-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.resend-dialog-actions {
  margin-top: 16px;
}

.resend-check-time {
  margin-bottom: 0 !important;
  font-size: 12px !important;
}

.limit-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  :deep(.el-input-number) {
    width: 100%;
  }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 900px) {
  .overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .limit-grid {
    grid-template-columns: 1fr;
  }

  .resend-inline-form,
  .resend-dialog-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .resend-dns-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .developer-page {
    padding: 12px;
  }

  .overview {
    grid-template-columns: 1fr;
  }
}
</style>
