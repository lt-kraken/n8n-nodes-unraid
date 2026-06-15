import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { unraidApiRequest } from './GenericFunctions';
import type { ControlLevel } from './operations';
import { getOperationRisk, resolveLevel, isAllowed, requiredLevel } from './operations';

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
			{
				displayName: 'Maximum Control Level',
				name: 'maxControlLevel',
				type: 'options',
				options: [
					{
						name: 'Use Credential Default',
						value: 'credential',
						description: 'Inherit the limit set on the Unraid credential',
					},
					{ name: 'Read', value: 'read', description: 'Read-only: status, lists, and metrics' },
					{
						name: 'Control',
						value: 'control',
						description: 'Read plus reversible state changes (start/stop/restart/pause, create/archive)',
					},
					{
						name: 'Full',
						value: 'full',
						description: 'Control plus destructive operations (stop array, force-stop VM, delete)',
					},
				],
				default: 'credential',
				description:
					'Caps what this node may do. It can only narrow below the credential limit, never exceed it. When this node is used as an AI Agent tool, set this to bound what the model can do.',
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

		const credentials = await this.getCredentials('unraidApi');
		const credLevel = (credentials.maxControlLevel as ControlLevel) ?? 'read';

		// Unraid's docker mutation reports its result by re-fetching the container after the
		// action, which can throw ("... not found after stopping/starting") even on success.
		// On that failure we do NOT assume success: we re-list the containers and confirm the
		// container actually reached the expected state (running for start/unpause, not-running
		// for stop/pause). This stops a failed start from being reported as a success.
		const runDockerMutation = async (mutation: string, containerId: string, op: string): Promise<IDataObject> => {
			try {
				const data = await unraidApiRequest.call(this, mutation, { id: containerId });
				const result = (data.docker as IDataObject)?.[op] as IDataObject | undefined;
				if (result && result.state) return result;
			} catch (error) {
				if (!/not found after/i.test((error as Error)?.message ?? '')) throw error;
			}
			// Re-fetch failed or returned nothing usable: confirm the real state.
			const listData = await unraidApiRequest.call(this, dockerQueries.getMany);
			const containers = ((listData.docker as IDataObject)?.containers as IDataObject[]) ?? [];
			const container = containers.find((c) => c.id === containerId || (c.names as string[])?.includes(containerId));
			const state = (container?.state as string) ?? 'NOT_FOUND';
			const mustRun = op === 'start' || op === 'unpause';
			if (mustRun ? state !== 'RUNNING' : state === 'RUNNING') {
				throw new NodeOperationError(
					this.getNode(),
					`Container ${containerId} did not reach the expected state after "${op}" (current state: ${state}).`,
				);
			}
			return container ?? { id: containerId, operation: op, success: true, state };
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				// Gate the operation against the effective control level (the lower of the
				// node's cap and the credential's ceiling) before touching the server.
				const risk = getOperationRisk(resource, operation);
				const nodeLevel = this.getNodeParameter('maxControlLevel', i, 'credential') as
					| ControlLevel
					| 'credential';
				const effective = resolveLevel(nodeLevel, credLevel);
				if (!isAllowed(risk, effective)) {
					throw new NodeOperationError(
						this.getNode(),
						`Operation "${operation}" on "${resource}" requires control level "${requiredLevel(risk)}", but the effective level is "${effective}". Raise "Maximum Control Level" on the Unraid credential (and on the node, if set) to allow it.`,
						{ itemIndex: i },
					);
				}

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
						await runDockerMutation(dockerMutations.stop, containerId, 'stop');
						// Brief pause so the container has time to fully stop before starting
						await new Promise((resolve) => setTimeout(resolve, 2000));
						await runDockerMutation(dockerMutations.start, containerId, 'start');
						results = [{ id: containerId, operation: 'restart', success: true }];
					}

					else {
						// start, stop, pause, unpause
						const containerId = this.getNodeParameter('containerId', i) as string;
						const mutation = dockerMutations[operation as keyof typeof dockerMutations] as string;
						results = [await runDockerMutation(mutation, containerId, operation)];
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
					if (operation === 'getUpsStatus') {
						// Unraid's API throws ("No UPS data returned from apcaccess") instead of
						// returning an empty list when no UPS is attached. Normalise that into a
						// plain not-connected result so consumers (including AI Agents) get data,
						// not an error. Genuine failures are still surfaced.
						try {
							const data = await unraidApiRequest.call(this, systemQueries.getUpsStatus);
							const devices = (data.upsDevices as IDataObject[]) ?? [];
							results = devices.length ? devices : [{ connected: false }];
						} catch (error) {
							const message = (error as Error)?.message ?? '';
							if (/ups|apcaccess/i.test(message)) {
								results = [{ connected: false }];
							} else {
								throw error;
							}
						}
					} else {
						const query = systemQueries[operation as keyof typeof systemQueries];
						const data = await unraidApiRequest.call(this, query);

						if (operation === 'getOnlineStatus') {
							results = [{ online: data.online ?? false }];
						} else if (operation === 'getRegistration') {
							results = [data.registration as IDataObject ?? {}];
						} else if (operation === 'getServerStatus') {
							results = (data.servers as IDataObject[]) ?? [];
						} else {
							const keyMap: Record<string, string> = {
								getInfo: 'info', getMetrics: 'metrics',
								getFlashInfo: 'flash', getConfig: 'config',
							};
							results = [data[keyMap[operation]] as IDataObject ?? {}];
						}
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

						// The Unraid NotificationType enum only has UNREAD and ARCHIVE; "ALL" is not a real
						// value, so fan out to both and concatenate the results.
						const types = type === 'ALL' ? ['UNREAD', 'ARCHIVE'] : [type];
						const collected: IDataObject[] = [];
						for (const t of types) {
							const filter: IDataObject = { type: t, offset, limit };
							if (importance) filter.importance = importance;
							const data = await unraidApiRequest.call(this, notificationQueries.getMany, { filter });
							collected.push(...(((data.notifications as IDataObject)?.list as IDataObject[]) ?? []));
						}
						results = collected;
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
