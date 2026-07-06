import * as ExpoHaptics from 'expo-haptics'
import { haptics } from '../haptics'
import { settingsStore } from '../settings-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	notificationAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
}))

describe('haptics', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('設定 ON のとき impactAsync を呼ぶ', async () => {
		await settingsStore.setHapticsEnabled(true)
		await haptics.tap()
		expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('light')
	})

	it('設定 OFF のとき何も呼ばない', async () => {
		await settingsStore.setHapticsEnabled(false)
		await haptics.tap()
		await haptics.success()
		await haptics.heavy()
		expect(ExpoHaptics.impactAsync).not.toHaveBeenCalled()
		expect(ExpoHaptics.notificationAsync).not.toHaveBeenCalled()
	})
})
