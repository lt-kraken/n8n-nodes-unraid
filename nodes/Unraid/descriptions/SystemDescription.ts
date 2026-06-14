import type { INodeProperties } from 'n8n-workflow';

export const systemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['system'] } },
		options: [
			{ name: 'Get Config',        value: 'getConfig',        description: 'Get system configuration validity',         action: 'Get system config' },
			{ name: 'Get Flash Info',    value: 'getFlashInfo',     description: 'Get USB flash drive info',                  action: 'Get flash info' },
			{ name: 'Get Info',          value: 'getInfo',          description: 'Get OS, CPU, memory, and version info',     action: 'Get system info' },
			{ name: 'Get Metrics',       value: 'getMetrics',       description: 'Get live CPU and memory metrics',           action: 'Get system metrics' },
			{ name: 'Get Online Status', value: 'getOnlineStatus',  description: 'Check whether the server is reachable',     action: 'Get online status' },
			{ name: 'Get Registration',  value: 'getRegistration',  description: 'Get Unraid license registration info',      action: 'Get registration' },
			{ name: 'Get Server Status', value: 'getServerStatus',  description: 'Get server status and access URLs',         action: 'Get server status' },
			{ name: 'Get UPS Status',    value: 'getUpsStatus',     description: 'Get UPS device status and battery info',    action: 'Get UPS status' },
		],
		default: 'getInfo',
	},
];

export const systemFields: INodeProperties[] = [];
