import { describe, it, expect, vi } from 'vitest';
import { Unraid } from '../nodes/Unraid/Unraid.node';

type Params = Record<string, unknown>;

/**
 * Build a minimal IExecuteFunctions stand-in driving a single input item.
 * `http` resolves the GraphQL envelope; tests assert on its captured calls.
 */
function makeContext(
	params: Params,
	http: ReturnType<typeof vi.fn>,
	continueOnFail = false,
	credLevel = 'full',
) {
	return {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name: string, _i: number, fallback?: unknown) =>
			name in params ? params[name] : fallback,
		continueOnFail: () => continueOnFail,
		getCredentials: vi.fn().mockResolvedValue({
			serverUrl: 'http://unraid.local',
			apiKey: 'k',
			allowUnauthorizedCerts: false,
			maxControlLevel: credLevel,
		}),
		getNode: () => ({ name: 'Unraid', type: 'unraid' }),
		helpers: { httpRequestWithAuthentication: http },
	};
}

function run(params: Params, response: unknown, continueOnFail = false, credLevel = 'full') {
	const http = vi.fn().mockResolvedValue(response);
	const ctx = makeContext(params, http, continueOnFail, credLevel);
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

describe('Unraid.execute — System UPS', () => {
	it('getUpsStatus returns the devices when a UPS is present', async () => {
		const { promise } = run(
			{ resource: 'system', operation: 'getUpsStatus' },
			{ data: { upsDevices: [{ id: 'ups1', status: 'OnLine' }] } },
		);
		const [out] = await promise;
		expect(out[0].json).toEqual({ id: 'ups1', status: 'OnLine' });
	});

	it('getUpsStatus normalises a "no UPS" API error to { connected: false }', async () => {
		const http = vi
			.fn()
			.mockRejectedValue(new Error('Failed to get UPS data: No UPS data returned from apcaccess'));
		const ctx = makeContext({ resource: 'system', operation: 'getUpsStatus' }, http);
		const [out] = await Unraid.prototype.execute.call(ctx as never);
		expect(out[0].json).toEqual({ connected: false });
	});

	it('getUpsStatus returns { connected: false } when the device list is empty', async () => {
		const { promise } = run(
			{ resource: 'system', operation: 'getUpsStatus' },
			{ data: { upsDevices: [] } },
		);
		const [out] = await promise;
		expect(out[0].json).toEqual({ connected: false });
	});

	it('getUpsStatus rethrows unrelated errors', async () => {
		const http = vi.fn().mockRejectedValue(new Error('network down'));
		const ctx = makeContext({ resource: 'system', operation: 'getUpsStatus' }, http, false);
		await expect(Unraid.prototype.execute.call(ctx as never)).rejects.toThrow('network down');
	});
});

describe('Unraid.execute — control level gating', () => {
	const okDocker = { data: { docker: { start: { id: 'docker:1', state: 'RUNNING' } } } };
	const okVm = { data: { vm: { forceStop: true } } };

	it('allows a read op at the Read level', async () => {
		const { promise, http } = run(
			{ resource: 'docker', operation: 'getMany' },
			{ data: { docker: { containers: [{ id: 'docker:1' }] } } },
			false,
			'read',
		);
		const [out] = await promise;
		expect(out).toHaveLength(1);
		expect(http).toHaveBeenCalled();
	});

	it('blocks a control op at the Read level (and never calls the API)', async () => {
		const { promise, http } = run(
			{ resource: 'docker', operation: 'start', containerId: 'docker:1' },
			okDocker,
			false,
			'read',
		);
		await expect(promise).rejects.toThrow(/requires control level/);
		expect(http).not.toHaveBeenCalled();
	});

	it('allows a control op at the Control level', async () => {
		const { promise } = run(
			{ resource: 'docker', operation: 'start', containerId: 'docker:1' },
			okDocker,
			false,
			'control',
		);
		const [out] = await promise;
		expect(out[0].json).toEqual({ id: 'docker:1', state: 'RUNNING' });
	});

	it('blocks a destructive op at the Control level', async () => {
		const { promise } = run(
			{ resource: 'vm', operation: 'forceStop', vmId: 'vm:1' },
			okVm,
			false,
			'control',
		);
		await expect(promise).rejects.toThrow(/requires control level "full"/);
	});

	it('allows a destructive op at the Full level', async () => {
		const { promise } = run(
			{ resource: 'vm', operation: 'forceStop', vmId: 'vm:1' },
			okVm,
			false,
			'full',
		);
		const [out] = await promise;
		expect(out[0].json).toEqual({ id: 'vm:1', operation: 'forceStop', success: true });
	});

	it('node level narrows below a Full credential (destructive blocked, control allowed)', async () => {
		const blocked = run(
			{ resource: 'vm', operation: 'forceStop', vmId: 'vm:1', maxControlLevel: 'control' },
			okVm,
			false,
			'full',
		);
		await expect(blocked.promise).rejects.toThrow(/requires control level/);

		const allowed = run(
			{ resource: 'docker', operation: 'start', containerId: 'docker:1', maxControlLevel: 'control' },
			okDocker,
			false,
			'full',
		);
		const [out] = await allowed.promise;
		expect(out[0].json).toEqual({ id: 'docker:1', state: 'RUNNING' });
	});

	it('node level cannot exceed the credential ceiling', async () => {
		const { promise } = run(
			{ resource: 'vm', operation: 'forceStop', vmId: 'vm:1', maxControlLevel: 'full' },
			okVm,
			false,
			'control',
		);
		await expect(promise).rejects.toThrow(/requires control level/);
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
