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
			description: 'API key from Unraid Settings > Management Access > API Key',
			required: true,
		},
		{
			displayName: 'Allow Unauthorized Certificates',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Whether to allow self-signed or otherwise invalid SSL certificates. Enable this if your Unraid server uses a self-signed certificate.',
		},
		{
			displayName: 'Maximum Control Level',
			name: 'maxControlLevel',
			type: 'options',
			options: [
				{
					name: 'Read',
					value: 'read',
					description: 'Read-only: status, lists, and metrics. Cannot change server state.',
				},
				{
					name: 'Control',
					value: 'control',
					description:
						'Read plus reversible state changes: start/stop/restart/pause containers and VMs, start the array, create/archive notifications.',
				},
				{
					name: 'Full',
					value: 'full',
					description:
						'Control plus destructive operations: stop the array, force-stop a VM, and permanently delete notifications.',
				},
			],
			default: 'read',
			description:
				'The highest level of operation any node — including an AI Agent tool — may perform with this credential. This is a hard ceiling tied to the API key; default is read-only.',
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
			skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
		},
	};
}
