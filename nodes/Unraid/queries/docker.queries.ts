const CONTAINER_FIELDS = `
	id
	names
	image
	imageId
	command
	created
	state
	status
	autoStart
	ports {
		ip
		privatePort
		publicPort
		type
	}
`;

const CONTAINER_FIELDS_FULL = `
	${CONTAINER_FIELDS}
	mounts
	networkSettings
`;

export const dockerQueries = {
	getMany: `query { docker { containers { ${CONTAINER_FIELDS} } } }`,
	get: `query { docker { containers { ${CONTAINER_FIELDS_FULL} } } }`,
};

export const dockerMutations = {
	start: `mutation StartContainer($id: PrefixedID!) {
		docker { start(id: $id) { id names state status } }
	}`,
	stop: `mutation StopContainer($id: PrefixedID!) {
		docker { stop(id: $id) { id names state status } }
	}`,
	pause: `mutation PauseContainer($id: PrefixedID!) {
		docker { pause(id: $id) { id names state status } }
	}`,
	unpause: `mutation UnpauseContainer($id: PrefixedID!) {
		docker { unpause(id: $id) { id names state status } }
	}`,
};
