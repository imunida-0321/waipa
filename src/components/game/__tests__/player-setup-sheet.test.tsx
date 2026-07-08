import { fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
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
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
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
// babel-preset-expo が react-native-reanimated のプラグインを自動適用するため、
// 配列 style を含むホストコンポーネントのレンダーで実体（未モック）の
// react-native-reanimated / react-native-worklets が遅延 require されてしまい
// ネイティブモジュール不在でクラッシュする。既存の他テスト（旧 player-setup-sheet
// テストや who-will-pay-game テスト等）と同様にモックして回避する。
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
	jest.clearAllMocks()
})

it('人数分のプレイヤーカードが表示される', async () => {
	const { getAllByPlaceholderText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	expect(getAllByPlaceholderText('プレイヤー名を入力...')).toHaveLength(4)
})

it('「追加」で1人増える', async () => {
	const { getByText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	fireEvent.press(getByText('⊕ 追加'))
	expect(playersStore.getState().count).toBe(5)
})

it('×で対象プレイヤーが名前ごと削除される', async () => {
	await playersStore.setName(0, 'A')
	await playersStore.setName(1, 'B')
	await playersStore.setName(2, 'C')
	await playersStore.setName(3, 'D')
	const { getAllByLabelText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	fireEvent.press(getAllByLabelText('プレイヤーを削除')[1])
	const s = playersStore.getState()
	expect(s.count).toBe(3)
	expect(s.names.slice(0, 3)).toEqual(['A', 'C', 'D'])
})

it('最小人数では削除ボタンが表示されない', async () => {
	await playersStore.setCount(2)
	const { queryAllByLabelText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	expect(queryAllByLabelText('プレイヤーを削除')).toHaveLength(0)
})

it('名前入力がストアに反映される', async () => {
	const { getAllByPlaceholderText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	fireEvent.changeText(getAllByPlaceholderText('プレイヤー名を入力...')[0], 'ひろ')
	expect(playersStore.getState().names[0]).toBe('ひろ')
})

it('履歴が空のとき空状態メッセージを表示', async () => {
	const { getByText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	expect(getByText('履歴がまだありません。')).toBeTruthy()
})

it('全員名前が入力されていれば「つぎへ」で履歴保存と onProceed が呼ばれる', async () => {
	await playersStore.setCount(2)
	await playersStore.setName(0, 'ひろ')
	await playersStore.setName(1, 'たろう')
	const onProceed = jest.fn()
	const { getByText } = await render(<PlayerSetupSheet onProceed={onProceed} />)
	fireEvent.press(getByText('つぎへ'))
	await waitFor(() => {
		expect(onProceed).toHaveBeenCalledTimes(1)
		expect(playersStore.getState().history.length).toBeGreaterThan(0)
	})
})

it('名前未入力があると「つぎへ」でエラーバナーが出て onProceed は呼ばれない', async () => {
	await playersStore.setCount(2)
	await playersStore.setName(0, 'ひろ')
	// 2人目は未入力のまま
	const onProceed = jest.fn()
	const { getByText } = await render(<PlayerSetupSheet onProceed={onProceed} />)
	fireEvent.press(getByText('つぎへ'))
	await waitFor(() => {
		expect(getByText('名前が入力されていないものがあります')).toBeTruthy()
	})
	expect(onProceed).not.toHaveBeenCalled()
})

it('×を押すと router.back が呼ばれる', async () => {
	const { getByLabelText } = await render(<PlayerSetupSheet onProceed={jest.fn()} />)
	fireEvent.press(getByLabelText('閉じる'))
	expect(router.back).toHaveBeenCalledTimes(1)
})
