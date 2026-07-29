import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import KvConst from '../src/const/kv-const';

describe('settings bootstrap', () => {
	beforeEach(async () => {
		const response = await SELF.fetch(`http://example.com/api/init/${env.jwt_secret}`);
		expect(await response.text()).toBe('success');
	});

	it('rebuilds a missing KV settings cache from D1', async () => {
		await env.kv.delete(KvConst.SETTING);
		expect(await env.kv.get(KvConst.SETTING)).toBeNull();

		const response = await SELF.fetch('http://example.com/api/setting/websiteConfig');
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.code).toBe(200);
		expect(body.data.title).toBe('Cloud Mail');
		expect(await env.kv.get(KvConst.SETTING)).not.toBeNull();
	});
});
