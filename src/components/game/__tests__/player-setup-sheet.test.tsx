import { fireEvent, render } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { playersStore } from '@/lib/players-store'
import { PlayerSetupSheet } from '../player-setup-sheet'

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
jest.mock('@/components/ui/gradient-button', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		GradientButton: ({ title, onPress }: { title: string; onPress: () => void }) => (
			<Pressable onPress={onPress}>
				<Text>{title}</Text>
			</Pressable>
		),
	}
})

beforeEach(async () => {
	await AsyncStorage.clear()
	await playersStore.hydrate()
})

it('現在の人数が表示される', async () => {
	const { getByText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	expect(getByText('4人')).toBeTruthy()
})

it('＋で人数が増える', async () => {
	const { getByText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	fireEvent.press(getByText('＋'))
	expect(playersStore.getState().count).toBe(5)
})

it('名前入力がストアに反映される', async () => {
	const { getByPlaceholderText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	fireEvent.changeText(getByPlaceholderText('1番'), 'ひろ')
	expect(playersStore.getState().names[0]).toBe('ひろ')
})

it('「決定」で onClose が呼ばれる', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(<PlayerSetupSheet visible onClose={onClose} />)
	fireEvent.press(getByText('決定'))
	expect(onClose).toHaveBeenCalledTimes(1)
})
