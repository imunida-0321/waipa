import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, render } from '@testing-library/react-native'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { customPunishmentsStore, getActiveSet } from '@/lib/custom-punishments-store'
import { glass, spacing } from '@/theme/tokens'
import { CustomPunishmentsSheet } from '../custom-punishments-sheet'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
// ノッチのある iPhone を想定した安全領域（上=ステータスバー、下=ホームインジケータ）
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
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
			'💡 カスタムお題は優先して盤面に入り、その分プリセットのお題と入れ替わります。盤面のペア数より多く登録すると、毎回その中からランダムに選ばれます。',
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

describe('ガラス面', () => {
	it('シート内の行・チップはガラス面で描画される', async () => {
		await customPunishmentsStore.addItem('normal', '右隣の人を褒めて1杯')
		const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)

		expect(utils.getAllByTestId('glass-surface-pseudo').length).toBeGreaterThan(0)

		await act(async () => {
			fireEvent.press(utils.getByText('⊕ 追加'))
		})

		expect(utils.getAllByTestId('glass-surface-pseudo').length).toBeGreaterThan(0)
	})

	it('アクティブタブは半透明の塗りになる', async () => {
		const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
		const activeTab = utils.getByRole('button', { name: /通常罰 \d+\/20/ })
		const tabStyle = StyleSheet.flatten(activeTab.props.style)

		expect(tabStyle.backgroundColor).toBe(glass.fallbackFill)

		await act(async () => {
			fireEvent.press(utils.getByText('⊕ 追加'))
		})

		const activeSegment = utils.getByRole('button', { name: '通常罰' })
		const segmentStyle = StyleSheet.flatten(activeSegment.props.style)

		expect(segmentStyle.backgroundColor).toBe(glass.fallbackFill)
	})
})

// RNTL v14 の要素型と react-test-renderer の型が非互換のため、必要な形だけの構造的型で受ける
type StyledNode = { parent: StyledNode | null; props: { style?: StyleProp<ViewStyle> } }

// 祖先の要素に指定されている余白の値を集める
function ancestorPaddings(node: StyledNode, key: 'paddingTop' | 'paddingBottom'): number[] {
	const values: number[] = []
	for (let current = node.parent; current; current = current.parent) {
		const value = StyleSheet.flatten(current.props.style)?.[key]
		if (typeof value === 'number') values.push(value)
	}
	return values
}

describe('安全領域（issue #166）', () => {
	it('ヘッダーを、上の安全領域（ステータスバー）のぶんだけ下げる', async () => {
		const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
		expect(ancestorPaddings(utils.getByLabelText('閉じる'), 'paddingTop')).toContain(59)
	})

	it('「完了」ボタンを、下の安全領域（ホームインジケータ）のぶんだけ上げる', async () => {
		const utils = await render(<CustomPunishmentsSheet visible onClose={jest.fn()} />)
		expect(ancestorPaddings(utils.getByText('完了'), 'paddingBottom')).toContain(
			34 + spacing.md,
		)
	})
})
