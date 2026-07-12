import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';
import openApiService from '../service/open-api-service';

app.get('/open/overview', async (c) => {
	const data = await openApiService.overview(c, userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.get('/open/apiKey/list', async (c) => {
	const data = await openApiService.apiKeyList(c, userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/open/apiKey/create', async (c) => {
	const data = await openApiService.apiKeyCreate(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.delete('/open/apiKey/delete', async (c) => {
	await openApiService.apiKeyDelete(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/open/apiKey/status', async (c) => {
	await openApiService.apiKeySetStatus(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/open/apiKey/quota', async (c) => {
	await openApiService.apiKeySetQuota(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/open/smtpAccount/list', async (c) => {
	const data = await openApiService.smtpAccountList(c, userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/open/smtpAccount/create', async (c) => {
	const data = await openApiService.smtpAccountCreate(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/open/smtpAccount/provision', async (c) => {
	const data = await openApiService.smtpAccountProvision(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/open/smtpAccount/provisionSender', async (c) => {
	const data = await openApiService.smtpAccountProvisionSender(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.delete('/open/smtpAccount/delete', async (c) => {
	await openApiService.smtpAccountDelete(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/open/smtpAccount/status', async (c) => {
	await openApiService.smtpAccountSetStatus(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/open/smtpAccount/password', async (c) => {
	const data = await openApiService.smtpAccountResetPassword(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.get('/open/sender/list', async (c) => {
	const data = await openApiService.senderList(c, userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/open/sender/create', async (c) => {
	const data = await openApiService.senderCreate(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.delete('/open/sender/delete', async (c) => {
	await openApiService.senderDelete(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/open/sender/status', async (c) => {
	await openApiService.senderSetStatus(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/open/sender/verify', async (c) => {
	await openApiService.senderVerify(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/open/sender/adminVerify', async (c) => {
	await openApiService.senderMarkVerified(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/open/logs', async (c) => {
	const data = await openApiService.logs(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/open/sendCode', async (c) => {
	const data = await openApiService.sendCode(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/open/sendNotice', async (c) => {
	const data = await openApiService.sendNotice(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/open/sendAutoMail', async (c) => {
	const data = await openApiService.sendAutoMail(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/open/sendStatus', async (c) => {
	const data = await openApiService.sendStatus(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/smtp/auth', async (c) => {
	const data = await openApiService.smtpAuth(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/smtp/send', async (c) => {
	const data = await openApiService.smtpSend(c, await c.req.json());
	return c.json(result.ok(data));
});
