export const systemQueries = {
	getInfo: `query {
		info {
			id time
			os { platform distro release kernel arch hostname }
			cpu { manufacturer brand cores threads speed }
			memory { layout { size bank type clockSpeed manufacturer formFactor } }
			system { manufacturer model version serial }
			versions {
				core { unraid api kernel }
				packages { openssl node }
			}
		}
	}`,

	getMetrics: `query {
		metrics {
			id
			cpu {
				percentTotal
				cpus { percentTotal percentUser percentSystem percentIdle }
			}
			memory { total used free available active buffcache percentTotal }
		}
	}`,

	getOnlineStatus: `query { online }`,

	getUpsStatus: `query {
		upsDevices {
			id name status model
			battery { chargeLevel estimatedRuntime health }
			power { inputVoltage outputVoltage loadPercentage }
		}
	}`,

	getServerStatus: `query {
		servers {
			id name guid status wanip lanip localurl remoteurl
		}
	}`,

	getFlashInfo: `query {
		flash { id vendor product }
	}`,

	getRegistration: `query {
		registration { id state type expiration }
	}`,

	getConfig: `query {
		config { id valid error }
	}`,
};
