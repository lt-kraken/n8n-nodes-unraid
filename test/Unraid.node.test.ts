import { describe, it, expect, vi } from 'vitest';
import { Unraid } from '../nodes/Unraid/Unraid.node';

type Params = Record<string, unknown>;

/**
 * Build a minimal IExecuteFunctions stand-in driving a single input item.
 * `http` resolves the GraphQL envelope; tests assert on its captured calls.
 */
function makeContext(params: Params, http: ReturnType<typeof vi.fn>, continueOnFail = false) {
	return {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name: string, _i: number, fallback?: unknown) =>
			name in params ? params[name] : fallback,
		continueOnFail: () => continueOnFail,
		getCredentials: vi.fn().mockResolvedValue({
			serverUrl: 'http://unraid.local',
			apiKey: 'k',
			allowUnauthorizedCerts: false,
		}),
		getNode: () => ({ name: 'Unraid', type: 'unraid' }),
		helpers: { httpRequestWithAuthentication: http },
	};
}

function run(params: Params, response: unknown, continueOnFail = false) {
	const http = vi.fn().mockResolvedValue(response);
	const ctx = makeContext(params, http, continueOnFail);
	return { promise: Unraid.prototype.execute.call(ctx as never), http };
}

describe('Unraid.execute — Docker', () => {
	it('getMany returns the container list', async () => {
		const { promise } = run(
			{ resource: 'docker', operation: 'getMany' },
			{ data: { docker: { containers: [{ id: 'docker:1' }, { id: 'docker:2' }] } } },
		);
		const [out] = await promise;
		expect(out.map((r) => r.json)).toEqual([{ id: 'docker:1' }, { id: 'docker:2' }]);
		expect(out[0].pairedItem).toEqual({ item: 0 });
	});

	it('get matches a container by name, not just id', async () => {
		const { promise } = run(
			{ resource: 'docker', operation: 'get', containerId: 'plex' },
			{
				data: {
					docker: {
						containers: [
							{ id: 'docker:1', names: ['sonarr'] },
							{ id: 'docker:2', names: ['plex'] },
						],
					},
				},
			},
		);
		const [out] = await promise;
		expect(out).toHaveLength(1);
		expect(out[0].json).toEqual({ id: 'docker:2', names: ['plex'] });
	});

	it('get returns nothing when no container matches', async () => {
		const { promise } = run(
			{ resource: 'docker', operation: 'get', containerId: 'missing' },
			{ data: { docker: { containers: [{ id: 'docker:1', names: ['a'] }] } } },
		);
		const [out] = await promise;
		expect(out).toHaveLength(0);
	});

	it('start sends the id as a GraphQL variable', async () => {
		const { promise, http } = run(
			{ resource: 'docker', operation: 'start', containerId: 'docker:1' },
			{ data: { docker: { start: { id: 'docker:1', state: 'RUNNING' } } } },
		);
		const [out] = await promise;
		expect(out[0].json).toEqual({ id: 'docker:1', state: 'RUNNING' });
		expect(http.mock.calls[0][1].body.variables).toEqual({ id: 'docker:1' });
	});
});

describe('Unraid.execute — Array', () => {
	it('getDisks tags each disk with its role and flattens the groups', async () => {
		const { promise } = run(
			{ resource: 'array', operation: 'getDisks' },
			{
				data: {
					array: {
						parities: [{ id: 'p1' }],
						disks: [{ id: 'd1' }, { id: 'd2' }],
						caches: [{ id: 'c1' }],
					},
				},
			},
		);
		const [out] = await promise;
		expect(out.map((r) => r.json)).toEqual([
			{ id: 'p1', role: 'parity' },
			{ id: 'd1', role: 'data' },
			{ id: 'd2', role: 'data' },
			{ id: 'c1', role: 'cache' },
		]);
	});
});

describe('Unraid.execute — Notification', () => {
	it('getMany builds a filter and omits importance when empty', async () => {
		const { promise, http } = run(
			{
				resource: 'notification',
				operation: 'getMany',
				notificationType: 'UNREAD',
				importance: '',
				limit: 50,
				offset: 10,
			},
			{ data: { notifications: { list: [{ id: 'n1' }] } } },
		);
		const [out] = await promise;
		expect(out[0].json).toEqual({ id: 'n1' });
		expect(http.mock.calls[0][1].body.variables.filter).toEqual({
			type: 'UNREAD',
			offset: 10,
			limit: 50,
		});
	});

	it('getMany includes importance when provided', async () => {
		const { promise, http } = run(
			{
				resource: 'notification',
				operation: 'getMany',
				notificationType: 'UNREAD',
				importance: 'ALERT',
				limit: 50,
				offset: 0,
			},
			{ data: { notifications: { list: [] } } },
		);
		await promise;
		expect(http.mock.calls[0][1].body.variables.filter.importance).toBe('ALERT');
	});
});

describe('Unraid.execute — error handling', () => {
	it('continueOnFail captures the error as output instead of throwing', async () => {
		const http = vi.fn().mockRejectedValue(new Error('network down'));
		const ctx = makeContext({ resource: 'docker', operation: 'getMany' }, http, true);
		const [out] = await Unraid.prototype.execute.call(ctx as never);
		expect(out[0].json).toEqual({ error: 'network down' });
	});

	it('rethrows when continueOnFail is off', async () => {
		const http = vi.fn().mockRejectedValue(new Error('network down'));
		const ctx = makeContext({ resource: 'docker', operation: 'getMany' }, http, false);
		await expect(Unraid.prototype.execute.call(ctx as never)).rejects.toThrow('network down');
	});
});
