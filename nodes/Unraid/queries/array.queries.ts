const DISK_FIELDS = `
	id idx name device size status
	temp numReads numWrites numErrors
	fsSize fsFree fsUsed
	color isSpinning type
`;

export const arrayQueries = {
	getStatus: `query {
		array {
			id
			state
			capacity {
				kilobytes { free used total }
				disks { free used total }
			}
			parityCheckStatus {
				status progress errors speed correcting paused running
			}
		}
	}`,

	getDisks: `query {
		array {
			parities { ${DISK_FIELDS} }
			disks    { ${DISK_FIELDS} }
			caches   { ${DISK_FIELDS} }
		}
	}`,

	getShares: `query {
		shares {
			id name free used size
			include exclude cache
			comment color luksStatus
		}
	}`,

	getParityHistory: `query {
		parityHistory {
			date duration speed status errors correcting
		}
	}`,
};

export const arrayMutations = {
	start: `mutation { array { setState(input: { desiredState: START }) { id state } } }`,
	stop:  `mutation { array { setState(input: { desiredState: STOP  }) { id state } } }`,
};
