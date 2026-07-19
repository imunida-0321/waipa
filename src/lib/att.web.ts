// web 用スタブ。ATT (App Tracking Transparency) は iOS 固有の仕組みで web には存在しないため、
// 常に granted を返してダイアログ要求をスキップし、後続の広告初期化 (web では no-op) に進ませる
export const PermissionStatus = {
	GRANTED: 'granted',
	UNDETERMINED: 'undetermined',
	DENIED: 'denied',
} as const

type Status = (typeof PermissionStatus)[keyof typeof PermissionStatus]

export async function getTrackingPermissionsAsync(): Promise<{ status: Status }> {
	return { status: PermissionStatus.GRANTED }
}

export async function requestTrackingPermissionsAsync(): Promise<{ status: Status }> {
	return { status: PermissionStatus.GRANTED }
}
