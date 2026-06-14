import type { INodeProperties } from 'n8n-workflow';

export const diskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['disk'] } },
		options: [
			{ name: 'Get Many', value: 'getMany', description: 'List all physical disks', action: 'List all physical disks' },
		],
		default: 'getMany',
	},
];

export const diskFields: INodeProperties[] = [];
