/**
 * Central classification of every operation by how much damage it can do, plus the
 * control-level math that gates them. Keeping this in one place means the execute router
 * (and the tests) share a single source of truth — no risk lists scattered per resource.
 *
 * Control levels are ordered Read < Control < Full:
 *   - Read    → status / list / metric operations only; cannot change server state
 *   - Control → read + reversible state changes (start/stop/restart/pause, create/archive)
 *   - Full    → control + destructive ops (stop the array, force-stop a VM, delete data)
 */

export type OperationRisk = 'read' | 'control' | 'destructive';
export type ControlLevel = 'read' | 'control' | 'full';

const RANK: Record<ControlLevel, number> = { read: 0, control: 1, full: 2 };

const REQUIRED: Record<OperationRisk, ControlLevel> = {
	read: 'read',
	control: 'control',
	destructive: 'full',
};

// resource -> operation -> risk. Anything not listed (all disk/system ops, every getMany,
// getOverview, etc.) defaults to 'read'.
const RISK: Record<string, Record<string, OperationRisk>> = {
	docker: {
		start: 'control',
		stop: 'control',
		restart: 'control',
		pause: 'control',
		unpause: 'control',
	},
	array: {
		start: 'control',
		stop: 'destructive',
	},
	vm: {
		start: 'control',
		stop: 'control',
		restart: 'control',
		pause: 'control',
		resume: 'control',
		reboot: 'control',
		forceStop: 'destructive',
	},
	notification: {
		create: 'control',
		archive: 'control',
		archiveAll: 'control',
		delete: 'destructive',
	},
};

/** How dangerous a given resource+operation is. Unlisted combinations are read-only. */
export function getOperationRisk(resource: string, operation: string): OperationRisk {
	return RISK[resource]?.[operation] ?? 'read';
}

/**
 * Resolve the effective control level for a node run. The node parameter can only ever
 * *narrow* below the credential ceiling — never exceed it. `'credential'` means "inherit".
 */
export function resolveLevel(node: ControlLevel | 'credential', cred: ControlLevel): ControlLevel {
	if (node === 'credential') return cred;
	return RANK[node] < RANK[cred] ? node : cred;
}

/** Whether an operation of the given risk is permitted at the effective control level. */
export function isAllowed(risk: OperationRisk, effective: ControlLevel): boolean {
	return RANK[effective] >= RANK[REQUIRED[risk]];
}

/** The minimum control level an operation of the given risk requires. */
export function requiredLevel(risk: OperationRisk): ControlLevel {
	return REQUIRED[risk];
}
