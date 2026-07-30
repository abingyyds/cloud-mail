import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import KvConst from '../src/const/kv-const';
import emailUtils from '../src/utils/email-utils';

describe('email address formatting', () => {
	it('quotes names and removes header control characters', () => {
		expect(emailUtils.formatAddress('notice@example.com', 'ACME "Ops"\r\nBcc: victim@example.com'))
			.toBe('"ACME \\"Ops\\" Bcc: victim@example.com" <notice@example.com>');
	});
});

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

	it('creates customer Resend onboarding fields', async () => {
		const result = await env.db.prepare("PRAGMA table_info('sender_identity')").all();
		const columns = result.results.map(row => row.name);

		expect(columns).toContain('resend_token');
		expect(columns).toContain('resend_status');
		expect(columns).toContain('resend_last_check_time');
		expect(columns).toContain('resend_last_error');
	});

	it('keeps the customer Resend migration idempotent', async () => {
		const response = await SELF.fetch(`http://example.com/api/init/${env.jwt_secret}`);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('success');
	});
});

describe('static asset fallback', () => {
	it('returns a non-cacheable 404 instead of index.html for a missing module', async () => {
		const response = await SELF.fetch('http://example.com/assets/missing-versioned-module.js');

		expect(response.status).toBe(404);
		expect(response.headers.get('Content-Type')).toContain('text/plain');
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(await response.text()).toBe('Not Found');
	});
});
