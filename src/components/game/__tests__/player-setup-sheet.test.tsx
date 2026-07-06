import { fireEvent, render, waitFor } from '@testing-library/react-native'
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
jest.mock('@/theme/player-colors', () => ({
	playerColor: (index: number) => ({ name: `色${index}`, value: '#FF0000' }),
}))
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: jest.fn(() => ({
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
	})),
}))
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

it('×で対象プレイヤーが名前ごと削除される', async () => {
	await playersStore.setName(0, 'A')
	await playersStore.setName(1, 'B')
	await playersStore.setName(2, 'C')
	await playersStore.setName(3, 'D')
	const { getAllByLabelText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	fireEvent.press(getAllByLabelText('プレイヤーを削除')[1])
	const s = playersStore.getState()
	expect(s.count).toBe(3)
	expect(s.names.slice(0, 3)).toEqual(['A', 'C', 'D'])
})

it('最小人数では削除ボタンが表示されない', async () => {
	await playersStore.setCount(2)
	const { queryAllByLabelText } = await render(<PlayerSetupSheet visible onClose={jest.fn()} />)
	expect(queryAllByLabelText('プレイヤーを削除')).toHaveLength(0)
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
