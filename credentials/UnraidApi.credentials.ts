import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UnraidApi implements ICredentialType {
	name = 'unraidApi';
	displayName = 'Unraid API';
	documentationUrl = 'https://github.com/lt-kraken/n8n-nodes-unraid#credentials';
	properties: INodeProperties[] = [
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: '',
			placeholder: 'http://192.168.1.x:port',
			description: 'URL of your Unraid server including port',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API key from Unraid Settings → Management Access → API Key',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: '={{$credentials.serverUrl.replace(/\\/$/, "")}}/graphql',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: '{ info { os { platform } } }' }),
		},
	};
}
