import type { INodeProperties } from 'n8n-workflow';

export const dockerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['docker'] } },
		options: [
			{ name: 'Get',       value: 'get',       description: 'Get a single container by ID',  action: 'Get a container' },
			{ name: 'Get Many',  value: 'getMany',  description: 'List all containers',           action: 'List all containers' },
			{ name: 'Pause',     value: 'pause',     description: 'Pause a running container',     action: 'Pause a container' },
			{ name: 'Restart',   value: 'restart',   description: 'Restart a container',           action: 'Restart a container' },
			{ name: 'Start',     value: 'start',     description: 'Start a container',             action: 'Start a container' },
			{ name: 'Stop',      value: 'stop',      description: 'Stop a container',              action: 'Stop a container' },
			{ name: 'Unpause',   value: 'unpause',   description: 'Unpause a paused container',    action: 'Unpause a container' },
		],
		default: 'getMany',
	},
];

export const dockerFields: INodeProperties[] = [
	{
		displayName: 'Container ID',
		name: 'containerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['docker'],
				operation: ['get', 'start', 'stop', 'restart', 'pause', 'unpause'],
			},
		},
		default: '',
		placeholder: 'docker:abc123def456',
		description: 'Prefixed container ID (e.g. docker:abc123). Use Get Many to find IDs.',
	},
];
