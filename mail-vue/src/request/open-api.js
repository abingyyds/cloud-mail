import http from '@/axios/index.js';

export function openOverview() {
    return http.get('/open/overview')
}

export function apiKeyList() {
    return http.get('/open/apiKey/list')
}

export function apiKeyCreate(params) {
    return http.post('/open/apiKey/create', params)
}

export function apiKeyDelete(apiKeyId) {
    return http.delete('/open/apiKey/delete', {params: {apiKeyId}})
}

export function apiKeyStatus(apiKeyId, status) {
    return http.put('/open/apiKey/status', {apiKeyId, status})
}

export function apiKeyQuota(params) {
    return http.put('/open/apiKey/quota', params)
}

export function smtpAccountList() {
    return http.get('/open/smtpAccount/list')
}

export function smtpAccountCreate(params) {
    return http.post('/open/smtpAccount/create', params)
}

export function smtpAccountProvision(accountId, name) {
    return http.post('/open/smtpAccount/provision', {accountId, name})
}

export function smtpAccountProvisionSender(senderIdentityId, name) {
    return http.post('/open/smtpAccount/provisionSender', {senderIdentityId, name})
}

export function smtpAccountDelete(smtpAccountId) {
    return http.delete('/open/smtpAccount/delete', {params: {smtpAccountId}})
}

export function smtpAccountStatus(smtpAccountId, status) {
    return http.put('/open/smtpAccount/status', {smtpAccountId, status})
}

export function smtpAccountResetPassword(smtpAccountId) {
    return http.put('/open/smtpAccount/password', {smtpAccountId})
}

export function senderList() {
    return http.get('/open/sender/list')
}

export function senderCreate(params) {
    return http.post('/open/sender/create', params)
}

export function senderDelete(senderIdentityId) {
    return http.delete('/open/sender/delete', {params: {senderIdentityId}})
}

export function senderStatus(senderIdentityId, status) {
    return http.put('/open/sender/status', {senderIdentityId, status})
}

export function senderVerify(senderIdentityId) {
    return http.put('/open/sender/verify', {senderIdentityId})
}

export function openLogs(params) {
    return http.get('/open/logs', {params: {...params}})
}
