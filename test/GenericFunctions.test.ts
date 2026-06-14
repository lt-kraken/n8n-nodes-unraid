import { describe, it, expect, vi } from 'vitest';
import { NodeApiError } from 'n8n-workflow';
import { unraidApiRequest } from '../nodes/Unraid/GenericFunctions';

type HttpMock = ReturnType<typeof vi.fn>;

function makeContext(opts: {
	credentials?: Record<string, unknown>;
	httpResponse?: unknown;
	httpImpl?: HttpMock;
}) {
	const http: HttpMock =
		opts.httpImpl ?? vi.fn().mockResolvedValue(opts.httpResponse);

	const ctx = {
		getCredentials: vi.fn().mockResolvedValue(
			opts.credentials ?? {
				serverUrl: 'http://unraid.local:8080',
				apiKey: 'secret',
				allowUnauthorizedCerts: false,
			},
		),
		getNode: vi.fn().mockReturnValue({ name: 'Unraid', type: 'unraid' }),
		helpers: { httpRequestWithAuthentication: http },
	};

	return { ctx, http };
}

describe('unraidApiRequest', () => {
	it('posts to <serverUrl>/graphql and returns response.data', async () => {
		const { ctx, http } = makeContext({
			httpResponse: { data: { info: { os: { platform: 'linux' } } } },
		});

		const result = await unraidApiRequest.call(ctx as never, '{ info { os { platform } } }');

		expect(result).toEqual({ info: { os: { platform: 'linux' } } });

		const [credName, options] = http.mock.calls[0];
		expect(credName).toBe('unraidApi');
		expect(options.method).toBe('POST');
		expect(options.url).toBe('http://unraid.local:8080/graphql');
		expect(options.body.query).toContain('info');
	});

	it('strips a trailing slash from the server URL', async () => {
		const { ctx, http } = makeContext({
			credentials: { serverUrl: 'http://unraid.local:8080/', allowUnauthorizedCerts: false },
			httpResponse: { data: {} },
		});

		await unraidApiRequest.call(ctx as never, '{ info }');

		expect(http.mock.calls[0][1].url).toBe('http://unraid.local:8080/graphql');
	});

	it('passes skipSslCertificateValidation from credentials', async () => {
		const { ctx, http } = makeContext({
			credentials: { serverUrl: 'https://unraid.local', allowUnauthorizedCerts: true },
			httpResponse: { data: {} },
		});

		await unraidApiRequest.call(ctx as never, '{ info }');

		expect(http.mock.calls[0][1].skipSslCertificateValidation).toBe(true);
	});

	it('forwards query variables in the request body', async () => {
		const { ctx, http } = makeContext({ httpResponse: { data: {} } });

		await unraidApiRequest.call(ctx as never, 'mutation($id: ID!) {}', { id: 'docker:abc' });

		expect(http.mock.calls[0][1].body.variables).toEqual({ id: 'docker:abc' });
	});

	it('returns partial data when GraphQL errors arrive alongside data', async () => {
		const { ctx } = makeContext({
			httpResponse: {
				data: { docker: { containers: [] } },
				errors: [{ message: 'partial failure' }],
			},
		});

		const result = await unraidApiRequest.call(ctx as never, '{ docker }');

		expect(result).toEqual({ docker: { containers: [] } });
	});

	it('throws NodeApiError when errors arrive without data', async () => {
		const { ctx } = makeContext({
			httpResponse: {
				data: null,
				errors: [{ message: 'boom' }, { message: 'bang' }],
			},
		});

		await expect(unraidApiRequest.call(ctx as never, '{ docker }')).rejects.toBeInstanceOf(
			NodeApiError,
		);
	});
});
