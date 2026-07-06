import * as ExpoHaptics from 'expo-haptics'
import { settingsStore } from './settings-store'

// 設定 OFF 時は何もしない。ゲーム演出からは haptics.* だけを呼ぶこと
export const haptics = {
	async tap() {
		if (!settingsStore.getState().hapticsEnabled) return
		await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light)
	},
	async heavy() {
		if (!settingsStore.getState().hapticsEnabled) return
		await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy)
	},
	async success() {
		if (!settingsStore.getState().hapticsEnabled) return
		await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success)
	},
}
