// expo-tracking-transparency の手動モック（全テストに自動適用）
export const PermissionStatus = {
	UNDETERMINED: 'undetermined',
	GRANTED: 'granted',
	DENIED: 'denied',
}

function response(status: string) {
	return { status, granted: status === 'granted', canAskAgain: true, expires: 'never' as const }
}

export const getTrackingPermissionsAsync = jest.fn(async () =>
	response(PermissionStatus.UNDETERMINED),
)

export const requestTrackingPermissionsAsync = jest.fn(async () =>
	response(PermissionStatus.GRANTED),
)
