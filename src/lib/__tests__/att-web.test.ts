// web 用スタブ (att.web.ts) の挙動。expo-tracking-transparency は web で
// 「Cannot find native module 'ExpoTrackingTransparency'」を投げるため、web では ATT を常にスキップする
import { getTrackingPermissionsAsync, PermissionStatus } from '../att.web'

describe('att.web (web 向け no-op スタブ)', () => {
	it('getTrackingPermissionsAsync が UNDETERMINED 以外の status を返す (ATT ダイアログを出さない)', async () => {
		const { status } = await getTrackingPermissionsAsync()
		expect(status).not.toBe(PermissionStatus.UNDETERMINED)
	})
})
