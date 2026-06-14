import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { unraidApiRequest } from './GenericFunctions';

import { arrayOperations, arrayFields } from './descriptions/ArrayDescription';
import { diskOperations, diskFields } from './descriptions/DiskDescription';
import { dockerOperations, dockerFields } from './descriptions/DockerDescription';
import { notificationOperations, notificationFields } from './descriptions/NotificationDescription';
import { systemOperations, systemFields } from './descriptions/SystemDescription';
import { vmOperations, vmFields } from './descriptions/VmDescription';

import { arrayQueries, arrayMutations } from './queries/array.queries';
import { diskQueries } from './queries/disk.queries';
import { dockerQueries, dockerMutations } from './queries/docker.queries';
import { notificationQueries, notificationMutations } from './queries/notification.queries';
import { systemQueries } from './queries/system.queries';
import { vmQueries, vmMutations } from './queries/vm.queries';

export class Unraid implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Unraid',
		name: 'unraid',
		icon: 'file:unraid.svg',
		group: ['transform'],
		usableAsTool: true,
		version: 1,
		subtitle: '={{$parameter["operation"] + " " + $parameter["resource"]}}',
		description: 'Interact with the Unraid API — manage Docker containers, VMs, array health, disks, notifications, and system metrics',
		defaults: { name: 'Unraid' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'unraidApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Array',        value: 'array' },
					{ name: 'Disk',         value: 'disk' },
					{ name: 'Docker',       value: 'docker' },
					{ name: 'Notification', value: 'notification' },
					{ name: 'System',       value: 'system' },
					{ name: 'VM',           value: 'vm' },
				],
				default: 'docker',
			},
			...arrayOperations,       ...arrayFields,
			...diskOperations,        ...diskFields,
			...dockerOperations,      ...dockerFields,
			...notificationOperations, ...notificationFields,
			...systemOperations,      ...systemFields,
			...vmOperations,          ...vmFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let results: IDataObject[] = [];

				// ── Docker ────────────────────────────────────────────────────────────
				if (resource === 'docker') {
					if (operation === 'getMany') {
						const data = await unraidApiRequest.call(this, dockerQueries.getMany);
						results = ((data.docker as IDataObject)?.containers as IDataObject[]) ?? [];
					}

					else if (operation === 'get') {
						const containerId = this.getNodeParameter('containerId', i) as string;
						const data = await unraidApiRequest.call(this, dockerQueries.get);
						const containers = ((data.docker as IDataObject)?.containers as IDataObject[]) ?? [];
						const match = containers.find((c) => c.id === containerId || (c.names as string[])?.includes(containerId));
						results = match ? [match] : [];
					}

					else if (operation === 'restart') {
						const containerId = this.getNodeParameter('containerId', i) as string;
						await unraidApiRequest.call(this, dockerMutations.stop, { id: containerId });
						// Brief pause so the container has time to fully stop before starting
						await new Promise((resolve) => setTimeout(resolve, 2000));
						const startData = await unraidApiRequest.call(this, dockerMutations.start, { id: containerId });
						results = [(startData.docker as IDataObject)?.start as IDataObject ?? {}];
					}

					else {
						// start, stop, pause, unpause
						const containerId = this.getNodeParameter('containerId', i) as string;
						const mutation = dockerMutations[operation as keyof typeof dockerMutations] as string;
						const data = await unraidApiRequest.call(this, mutation, { id: containerId });
						results = [(data.docker as IDataObject)?.[operation] as IDataObject ?? {}];
					}
				}

				// ── Array ─────────────────────────────────────────────────────────────
				else if (resource === 'array') {
					if (operation === 'getStatus') {
						const data = await unraidApiRequest.call(this, arrayQueries.getStatus);
						results = [data.array as IDataObject ?? {}];
					}

					else if (operation === 'getDisks') {
						const data = await unraidApiRequest.call(this, arrayQueries.getDisks);
						const arr = data.array as IDataObject ?? {};
						const parities = ((arr.parities as IDataObject[]) ?? []).map((d) => ({ ...d, role: 'parity' }));
						const disks    = ((arr.disks    as IDataObject[]) ?? []).map((d) => ({ ...d, role: 'data' }));
						const caches   = ((arr.caches   as IDataObject[]) ?? []).map((d) => ({ ...d, role: 'cache' }));
						results = [...parities, ...disks, ...caches];
					}

					else if (operation === 'getShares') {
						const data = await unraidApiRequest.call(this, arrayQueries.getShares);
						results = (data.shares as IDataObject[]) ?? [];
					}

					else if (operation === 'getParityHistory') {
						const data = await unraidApiRequest.call(this, arrayQueries.getParityHistory);
						results = (data.parityHistory as IDataObject[]) ?? [];
					}

					else {
						// start, stop
						const mutation = arrayMutations[operation as keyof typeof arrayMutations];
						const data = await unraidApiRequest.call(this, mutation);
						results = [(data.array as IDataObject)?.setState as IDataObject ?? {}];
					}
				}

				// ── Disk ──────────────────────────────────────────────────────────────
				else if (resource === 'disk') {
					const data = await unraidApiRequest.call(this, diskQueries.getMany);
					results = (data.disks as IDataObject[]) ?? [];
				}

				// ── System ────────────────────────────────────────────────────────────
				else if (resource === 'system') {
					const query = systemQueries[operation as keyof typeof systemQueries];
					const data = await unraidApiRequest.call(this, query);

					if (operation === 'getOnlineStatus') {
						results = [{ online: data.online ?? false }];
					} else if (operation === 'getRegistration') {
						results = [data.registration as IDataObject ?? {}];
					} else if (operation === 'getServerStatus') {
						results = (data.servers as IDataObject[]) ?? [];
					} else if (operation === 'getUpsStatus') {
						results = (data.upsDevices as IDataObject[]) ?? [];
					} else {
						const keyMap: Record<string, string> = {
							getInfo: 'info', getMetrics: 'metrics',
							getFlashInfo: 'flash', getConfig: 'config',
						};
						results = [data[keyMap[operation]] as IDataObject ?? {}];
					}
				}

				// ── VM ────────────────────────────────────────────────────────────────
				else if (resource === 'vm') {
					if (operation === 'getMany') {
						const data = await unraidApiRequest.call(this, vmQueries.getMany);
						results = ((data.vms as IDataObject)?.domain as IDataObject[]) ?? [];
					}

					else if (operation === 'restart') {
						const vmId = this.getNodeParameter('vmId', i) as string;
						await unraidApiRequest.call(this, vmMutations.stop, { id: vmId });
						await new Promise((resolve) => setTimeout(resolve, 3000));
						await unraidApiRequest.call(this, vmMutations.start, { id: vmId });
						results = [{ id: vmId, operation: 'restart', success: true }];
					}

					else {
						const vmId = this.getNodeParameter('vmId', i) as string;
						const mutation = vmMutations[operation as keyof typeof vmMutations] as string;
						await unraidApiRequest.call(this, mutation, { id: vmId });
						results = [{ id: vmId, operation, success: true }];
					}
				}

				// ── Notification ──────────────────────────────────────────────────────
				else if (resource === 'notification') {
					if (operation === 'getMany') {
						const type       = this.getNodeParameter('notificationType', i) as string;
						const importance = this.getNodeParameter('importance', i) as string;
						const limit      = this.getNodeParameter('limit', i) as number;
						const offset     = this.getNodeParameter('offset', i) as number;
						const filter: IDataObject = { type, offset, limit };
						if (importance) filter.importance = importance;
						const data = await unraidApiRequest.call(this, notificationQueries.getMany, { filter });
						results = ((data.notifications as IDataObject)?.list as IDataObject[]) ?? [];
					}

					else if (operation === 'getOverview') {
						const data = await unraidApiRequest.call(this, notificationQueries.getOverview);
						results = [(data.notifications as IDataObject)?.overview as IDataObject ?? {}];
					}

					else if (operation === 'create') {
						const input: IDataObject = {
							title:       this.getNodeParameter('title', i) as string,
							subject:     this.getNodeParameter('subject', i) as string,
							description: this.getNodeParameter('description', i) as string,
							importance:  this.getNodeParameter('createImportance', i) as string,
						};
						const link = this.getNodeParameter('link', i) as string;
						if (link) input.link = link;
						const data = await unraidApiRequest.call(this, notificationMutations.create, { input });
						results = [data.createNotification as IDataObject ?? {}];
					}

					else if (operation === 'archive') {
						const id = this.getNodeParameter('notificationId', i) as string;
						const data = await unraidApiRequest.call(this, notificationMutations.archive, { id });
						results = [data.archiveNotification as IDataObject ?? {}];
					}

					else if (operation === 'archiveAll') {
						const data = await unraidApiRequest.call(this, notificationMutations.archiveAll);
						results = [data.archiveAll as IDataObject ?? {}];
					}

					else if (operation === 'delete') {
						const id   = this.getNodeParameter('notificationId', i) as string;
						const type = this.getNodeParameter('deleteType', i) as string;
						const data = await unraidApiRequest.call(this, notificationMutations.delete, { id, type });
						results = [data.deleteNotification as IDataObject ?? {}];
					}
				}

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
