// expo-tracking-transparency の platform 分岐ラッパー。
// web では import 時に「Cannot find native module 'ExpoTrackingTransparency'」で落ちるため、
// Metro が att.web.ts (常に granted を返すスタブ) を解決する。直接 import は gma-boundary.test.ts が禁止
export {
	getTrackingPermissionsAsync,
	PermissionStatus,
	requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency'
