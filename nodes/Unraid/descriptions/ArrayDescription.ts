import type { INodeProperties } from 'n8n-workflow';

export const arrayOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['array'] } },
		options: [
			{ name: 'Get Status',        value: 'getStatus',        description: 'Get array state, capacity, and parity check status', action: 'Get array status' },
			{ name: 'Get Disks',         value: 'getDisks',         description: 'List all array disks with health and temperature',   action: 'Get array disks' },
			{ name: 'Get Shares',        value: 'getShares',        description: 'List all user shares',                               action: 'Get shares' },
			{ name: 'Get Parity History', value: 'getParityHistory', description: 'Get parity check history',                          action: 'Get parity history' },
			{ name: 'Start',             value: 'start',            description: 'Start the array',                                    action: 'Start array' },
			{ name: 'Stop',              value: 'stop',             description: 'Stop the array',                                     action: 'Stop array' },
		],
		default: 'getStatus',
	},
];

export const arrayFields: INodeProperties[] = [];
