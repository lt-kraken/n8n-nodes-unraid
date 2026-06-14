export const vmQueries = {
	getMany: `query {
		vms { domain { id name uuid state } }
	}`,
};

export const vmMutations = {
	start:     `mutation StartVm($id: PrefixedID!)     { vm { start(id: $id)     } }`,
	stop:      `mutation StopVm($id: PrefixedID!)      { vm { stop(id: $id)      } }`,
	pause:     `mutation PauseVm($id: PrefixedID!)     { vm { pause(id: $id)     } }`,
	resume:    `mutation ResumeVm($id: PrefixedID!)    { vm { resume(id: $id)    } }`,
	reboot:    `mutation RebootVm($id: PrefixedID!)    { vm { reboot(id: $id)    } }`,
	forceStop: `mutation ForceStopVm($id: PrefixedID!) { vm { forceStop(id: $id) } }`,
};
