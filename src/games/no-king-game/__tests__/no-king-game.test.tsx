import { act, fireEvent, render } from '@testing-library/react-native'
import { NoKingGame } from '../no-king-game'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
	}
})

// rng=0.999 固定: 番号は恒等順列 [1,2,3,4]、お題はフォールバック末尾、実行役は最大番号
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0.999)
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

// deal フェーズを全員分確認して reveal まで進める
async function confirmAll(
	getByText: (t: string | RegExp) => unknown,
	getByLabelText: (t: string | RegExp) => unknown,
	count: number,
) {
	for (let i = 0; i < count; i++) {
		const pad = getByLabelText('長押しで自分の番号を表示')
		await act(async () => fireEvent(pad as never, 'pressIn'))
		await act(async () => fireEvent(pad as never, 'pressOut'))
		const label = i + 1 < count ? '確認した（次の人へ）' : '確認した（発表へ！）'
		await act(async () => fireEvent.press(getByText(label) as never))
	}
}

it('人数選択→番号配布→発表→次ラウンドまで一巡できる', async () => {
	jest.useFakeTimers()
	const { getByText, getByLabelText } = await render(<NoKingGame />)

	// count: デフォルト4人で開始
	expect(getByText('4人')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('番号を配る')))

	// deal: 長押しで番号表示（1人目 = 1番）
	expect(getByText(/1人目の人にスマホを渡してください/)).toBeTruthy()
	const pad = getByLabelText('長押しで自分の番号を表示')
	await act(async () => fireEvent(pad, 'pressIn'))
	expect(getByText('1番')).toBeTruthy()
	await act(async () => fireEvent(pad, 'pressOut'))
	await act(async () => fireEvent.press(getByText('確認した（次の人へ）')))
	expect(getByText(/2人目の人にスマホを渡してください/)).toBeTruthy()

	// 残り3人分確認して reveal へ
	for (let i = 1; i < 4; i++) {
		const p = getByLabelText('長押しで自分の番号を表示')
		await act(async () => fireEvent(p, 'pressIn'))
		await act(async () => fireEvent(p, 'pressOut'))
		const label = i + 1 < 4 ? '確認した（次の人へ）' : '確認した（発表へ！）'
		await act(async () => fireEvent.press(getByText(label)))
	}

	// reveal: お題カード＋運命のボタン
	expect(getByText('お題')).toBeTruthy()
	expect(getByText('10秒間ロボットダンスをする')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('運命のボタン')))

	// ドラムロール 2秒 → 発表
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	expect(getByText('4番！')).toBeTruthy()
	expect(getByText('4番の人は名乗り出て、お題を実行！')).toBeTruthy()

	// 次ラウンド: 番号配り直しで deal に戻る
	await act(async () => fireEvent.press(getByText('次のラウンド（番号を配り直す）')))
	expect(getByText('ROUND 2')).toBeTruthy()
	expect(getByText(/1人目の人にスマホを渡してください/)).toBeTruthy()
})

it('スキップでお題が引き直され、2回使うと使い切り表示になる', async () => {
	const { getByText, getByLabelText, queryByText } = await render(<NoKingGame />)
	await act(async () => fireEvent.press(getByText('番号を配る')))
	await confirmAll(getByText, getByLabelText, 4)

	expect(getByText('10秒間ロボットダンスをする')).toBeTruthy()
	await act(async () => fireEvent.press(getByText('お題をスキップ（残り2回）')))
	expect(queryByText('10秒間ロボットダンスをする')).toBeNull()
	await act(async () => fireEvent.press(getByText('お題をスキップ（残り1回）')))
	expect(getByText('スキップは使い切りました')).toBeTruthy()
	expect(queryByText(/お題をスキップ/)).toBeNull()
})

it('番号を表示するまで「確認した」ボタンは押せない', async () => {
	const { getByText, getByLabelText } = await render(<NoKingGame />)
	await act(async () => fireEvent.press(getByText('番号を配る')))

	// 長押し前に確認ボタンを押しても進まない
	await act(async () => fireEvent.press(getByText('確認した（次の人へ）')))
	expect(getByText(/1人目の人にスマホを渡してください/)).toBeTruthy()

	const pad = getByLabelText('長押しで自分の番号を表示')
	await act(async () => fireEvent(pad, 'pressIn'))
	await act(async () => fireEvent(pad, 'pressOut'))
	await act(async () => fireEvent.press(getByText('確認した（次の人へ）')))
	expect(getByText(/2人目の人にスマホを渡してください/)).toBeTruthy()
})
