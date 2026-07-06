import { fireEvent, render } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { settingsStore } from '@/lib/settings-store'
import SettingsScreen from '../settings'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))

beforeEach(async () => {
	await AsyncStorage.clear()
	await settingsStore.hydrate()
})

it('効果音とバイブレーションのトグルが表示される', async () => {
	const { getByText } = await render(<SettingsScreen />)
	expect(getByText('効果音')).toBeTruthy()
	expect(getByText('バイブレーション')).toBeTruthy()
})

it('トグル操作でストアが更新される', async () => {
	const { getAllByRole } = await render(<SettingsScreen />)
	fireEvent(getAllByRole('switch')[0], 'valueChange', false)
	expect(settingsStore.getState().soundEnabled).toBe(false)
})
