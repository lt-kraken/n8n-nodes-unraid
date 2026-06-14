const NOTIFICATION_FIELDS = `
	id title subject description importance link type timestamp formattedTimestamp
`;

const OVERVIEW_FIELDS = `
	unread  { info warning alert total }
	archive { info warning alert total }
`;

export const notificationQueries = {
	getMany: `query GetNotifications($filter: NotificationFilter!) {
		notifications { list(filter: $filter) { ${NOTIFICATION_FIELDS} } }
	}`,

	getOverview: `query {
		notifications { overview { ${OVERVIEW_FIELDS} } }
	}`,
};

export const notificationMutations = {
	create: `mutation CreateNotification($input: NotificationData!) {
		createNotification(input: $input) { ${NOTIFICATION_FIELDS} }
	}`,

	archive: `mutation ArchiveNotification($id: PrefixedID!) {
		archiveNotification(id: $id) { id title type }
	}`,

	archiveAll: `mutation ArchiveAll {
		archiveAll { ${OVERVIEW_FIELDS} }
	}`,

	delete: `mutation DeleteNotification($id: PrefixedID!, $type: NotificationType!) {
		deleteNotification(id: $id, type: $type) { ${OVERVIEW_FIELDS} }
	}`,
};
