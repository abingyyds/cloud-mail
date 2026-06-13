import app from '../hono/hono';
import result from '../model/result';
import publicService from '../service/public-service';

app.post('/public/genToken', async (c) => {
	const data = await publicService.genToken(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/public/emailList', async (c) => {
	const list = await publicService.emailList(c, await c.req.json());
	return c.json(result.ok(list));
});

app.post('/public/addUser', async (c) => {
	await publicService.addUser(c, await c.req.json());
	return c.json(result.ok());
});

app.post('/public/sendCode', async (c) => {
	const data = await publicService.sendCode(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/public/sendNotice', async (c) => {
	const data = await publicService.sendNotice(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/public/sendAutoMail', async (c) => {
	const data = await publicService.sendAutoMail(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/public/sendStatus', async (c) => {
	const data = await publicService.sendStatus(c, await c.req.json());
	return c.json(result.ok(data));
});
