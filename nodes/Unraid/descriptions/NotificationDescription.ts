import type { INodeProperties } from 'n8n-workflow';

export const notificationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['notification'] } },
		options: [
			{ name: 'Archive',     value: 'archive',    description: 'Archive a notification',       action: 'Archive a notification' },
			{ name: 'Archive All', value: 'archiveAll', description: 'Archive all notifications',    action: 'Archive all notifications' },
			{ name: 'Create',      value: 'create',     description: 'Create a notification',        action: 'Create a notification' },
			{ name: 'Delete',      value: 'delete',     description: 'Delete a notification (destructive — requires Full control level)', action: 'Delete a notification' },
			{ name: 'Get Many',    value: 'getMany',    description: 'List notifications',           action: 'List notifications' },
			{ name: 'Get Overview', value: 'getOverview', description: 'Get unread/archived counts', action: 'Get notification overview' },
		],
		default: 'getMany',
	},
];

export const notificationFields: INodeProperties[] = [
	// ── getMany filters ───────────────────────────────────────────────────────
	{
		displayName: 'Type',
		name: 'notificationType',
		type: 'options',
		displayOptions: { show: { resource: ['notification'], operation: ['getMany'] } },
		options: [
			{ name: 'Unread',   value: 'UNREAD' },
			{ name: 'Archived', value: 'ARCHIVED' },
			{ name: 'All',      value: 'ALL' },
		],
		default: 'UNREAD',
		description: 'Which notifications to return',
	},
	{
		displayName: 'Importance',
		name: 'importance',
		type: 'options',
		displayOptions: { show: { resource: ['notification'], operation: ['getMany'] } },
		options: [
			{ name: 'All',     value: '' },
			{ name: 'Info',    value: 'INFO' },
			{ name: 'Warning', value: 'WARNING' },
			{ name: 'Alert',   value: 'ALERT' },
		],
		default: '',
		description: 'Filter by importance level. Leave empty for all.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['notification'], operation: ['getMany'] } },
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		typeOptions: { minValue: 0 },
		displayOptions: { show: { resource: ['notification'], operation: ['getMany'] } },
		default: 0,
		description: 'Number of notifications to skip (for pagination)',
	},

	// ── create fields ─────────────────────────────────────────────────────────
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['notification'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['notification'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: { show: { resource: ['notification'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Importance',
		name: 'createImportance',
		type: 'options',
		displayOptions: { show: { resource: ['notification'], operation: ['create'] } },
		options: [
			{ name: 'Info',    value: 'INFO' },
			{ name: 'Warning', value: 'WARNING' },
			{ name: 'Alert',   value: 'ALERT' },
		],
		default: 'INFO',
	},
	{
		displayName: 'Link',
		name: 'link',
		type: 'string',
		displayOptions: { show: { resource: ['notification'], operation: ['create'] } },
		default: '',
		description: 'Optional URL to attach to the notification',
	},

	// ── archive / delete ──────────────────────────────────────────────────────
	{
		displayName: 'Notification ID',
		name: 'notificationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['notification'], operation: ['archive', 'delete'] },
		},
		default: '',
		placeholder: 'notification:abc123',
	},
	{
		displayName: 'Notification Type',
		name: 'deleteType',
		type: 'options',
		required: true,
		displayOptions: { show: { resource: ['notification'], operation: ['delete'] } },
		options: [
			{ name: 'Unread',   value: 'UNREAD' },
			{ name: 'Archived', value: 'ARCHIVED' },
		],
		default: 'UNREAD',
		description: 'Where the notification currently lives',
	},
];
