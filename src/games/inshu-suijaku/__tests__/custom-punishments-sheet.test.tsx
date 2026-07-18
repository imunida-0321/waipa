import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, render } from '@testing-library/react-native'
import { customPunishmentsStore, getActiveSet } from '@/lib/custom-punishments-store'
import { CustomPunishmentsSheet } from '../custom-punishments-sheet'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

beforeEach(async () => {
	await AsyncStorage.clear()
	await customPunishmentsStore.hydrate()
	jest.clearAllMocks()
})

it('visible=true でタイトルとデフォルトセット名が表示される', async () => {
	const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
	expect(utils.getByText('カスタムお題')).toBeTruthy()
	expect(utils.getByText('マイセット')).toBeTruthy()
})

it('デッキへの混ざり方の tips が一覧に表示される', async () => {
	const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
	expect(
		utils.getByText(
			'💡 カスタムお題は優先して盤面に入り、そのぶんプリセットのお題と入れ替わります。盤面のペア数より多く登録すると、毎回その中からランダムに選ばれます。',
		),
	).toBeTruthy()
})

it('追加フォームで保存すると store にアイテムが増え、リストに表示される', async () => {
	const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
	await act(async () => {
		fireEvent.press(utils.getByText('⊕ 追加'))
	})
	await act(async () => {
		fireEvent.changeText(utils.getByPlaceholderText('お題を入力...'), '右隣の人を褒めて1杯')
	})
	await act(async () => {
		fireEvent.press(utils.getByText('保存する'))
	})
	expect(getActiveSet(customPunishmentsStore.getState()).items).toHaveLength(1)
	expect(utils.getByText('右隣の人を褒めて1杯')).toBeTruthy()
})

it('空文字のとき「保存する」が disabled になる', async () => {
	const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
	await act(async () => {
		fireEvent.press(utils.getByText('⊕ 追加'))
	})
	const saveButton = utils.getByRole('button', { name: '保存する' })
	expect(saveButton.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }))
})

it('タブ切替で special のみ表示される', async () => {
	await customPunishmentsStore.addItem('normal', '通常のお題')
	await customPunishmentsStore.addItem('special', '特大のお題')
	const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
	expect(utils.getByText('通常のお題')).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText(/特大罰/))
	})
	expect(utils.queryByText('通常のお題')).toBeNull()
	expect(utils.getByText('特大のお題')).toBeTruthy()
})

it('削除ボタンで store から消える', async () => {
	await customPunishmentsStore.addItem('normal', '消すお題')
	const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
	await act(async () => {
		fireEvent.press(utils.getByLabelText('削除'))
	})
	expect(getActiveSet(customPunishmentsStore.getState()).items).toHaveLength(0)
	expect(utils.queryByText('消すお題')).toBeNull()
})

it('「デッキに混ぜる」トグルで enabled が切り替わる', async () => {
	const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
	await act(async () => {
		fireEvent(utils.getByRole('switch'), 'valueChange', false)
	})
	expect(customPunishmentsStore.getState().enabled).toBe(false)
})

it('「＋セット」でセットが増えアクティブが移る', async () => {
	const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
	await act(async () => {
		fireEvent.press(utils.getByText('＋セット'))
	})
	const s = customPunishmentsStore.getState()
	expect(s.sets).toHaveLength(2)
	expect(getActiveSet(s).name).toBe('セット2')
	expect(utils.getByText('セット2')).toBeTruthy()
})

it('×ボタンで onClose が呼ばれる', async () => {
	const onClose = jest.fn()
	const utils = await render(<CustomPunishmentsSheet visible onClose={onClose} />)
	await act(async () => {
		fireEvent.press(utils.getByLabelText('閉じる'))
	})
	expect(onClose).toHaveBeenCalledTimes(1)
})
