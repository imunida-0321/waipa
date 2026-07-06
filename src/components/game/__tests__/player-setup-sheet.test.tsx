import { fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { playersStore } from '@/lib/players-store'
import { PlayerSetupSheet } from '../player-setup-sheet'

jest.mock('react-native-reanimated', () => ({
	__esModule: true,
	useAnimatedStyle: jest.fn(() => ({})),
	useSharedValue: jest.fn(() => ({ value: 0 })),
	withTiming: jest.fn((v) => v),
	getUseOfValueInStyleWarning: jest.fn(() => () => {}),
	createWorkletRuntime: jest.fn(),
	runOn: jest.fn((runtime, fn) => fn),
	runOnJS: jest.fn((fn) => fn),
}))
jest.mock('react-native-worklets', () => ({
	__esModule: true,
	Worklets: { defaultContext: {} },
}))

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
jest.mock('@/theme/player-colors', () => ({
	playerColor: (index: number) => ({ name: `色${index}`, value: '#FF0000' }),
}))

beforeEach(async () => {
	await AsyncStorage.clear()
	await playersStore.hydrate()
})

it('人数分のプレイヤーカードが表示される', async () => {
	const { getAllByPlaceholderText } = await render(
		<PlayerSetupSheet visible onClose={jest.fn()} />,
	)
	expect(getAllByPlaceholderText('プレイヤー名を入力...')).toHaveLength(4)
})

it('「追加」で1人増える', async () => {
	const { getByText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	fireEvent.press(getByText('⊕ 追加'))
	expect(playersStore.getState().count).toBe(5)
})

it('×で対象プレイヤーが削除される', async () => {
	const { getAllByPlaceholderText, getAllByText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	// Make sure we have 4 players first
	expect(getAllByPlaceholderText('プレイヤー名を入力...')).toHaveLength(4)
	// Find all remove buttons (should be 4, same as number of cards)
	const removeButtons = getAllByText('×')
	// The last 4 should be the remove buttons (first one is header close button)
	fireEvent.press(removeButtons[removeButtons.length - 4])
	expect(playersStore.getState().count).toBe(3)
})

it('名前入力がストアに反映される', async () => {
	const { getAllByPlaceholderText } = await render(
		<PlayerSetupSheet visible onClose={jest.fn()} />,
	)
	fireEvent.changeText(getAllByPlaceholderText('プレイヤー名を入力...')[0], 'ひろ')
	expect(playersStore.getState().names[0]).toBe('ひろ')
})

it('「つぎへ」で履歴保存と onClose', async () => {
	await playersStore.setName(0, 'ひろ')
	const onClose = jest.fn()
	const { getByText } = await render(<PlayerSetupSheet visible onClose={onClose} />)
	fireEvent.press(getByText('つぎへ'))
	await waitFor(() => {
		expect(onClose).toHaveBeenCalledTimes(1)
		expect(playersStore.getState().history.length).toBeGreaterThan(0)
	})
})

it('履歴が空のとき空状態メッセージを表示', async () => {
	const { getByText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	expect(getByText('履歴がまだありません。')).toBeTruthy()
})
