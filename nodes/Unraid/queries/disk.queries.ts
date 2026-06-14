export const diskQueries = {
	getMany: `query {
		disks {
			id name device size type isSpinning
		}
	}`,
};
