import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactTestInstance } from 'react-test-renderer'
import { LUCKY_MS } from '../lucky-cutin'
import { LANDED_MS, ROLL_MS } from '../player-roulette'
import { MISMATCH_MS, ReactionPairsGame } from '../reaction-pairs-game'

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
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 2, names: ['あか', 'あお'], history: [] }),
	getDisplayNames: () => ['あか', 'あお'],
}))
jest.mock('@/lib/topics-store', () => ({
	useTopics: () => ({ topics: [], fetchedAt: null }),
}))
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
	}
})

function hasAncestorTestId(node: ReactTestInstance, testID: string): boolean {
	let current = node.parent
	while (current) {
		if (current.props.testID === testID) return true
		current = current.parent
	}
	return false
}

// Math.random を固定してデッキ順を決定的にする。
// shuffle が Fisher–Yates（後ろから rng() * (i+1)）なので、常に 0.999… を返すと
// swap が自分自身になり、デッキは生成順（p1-a, p1-b, p2-a, ... , joker, lucky）のまま並ぶ
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0.9999999)
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

it('手番表示 → ペア成立 → ルーレット → 罰発表 → 手番交代まで通る', async () => {
	const { getByText, getByLabelText, queryByText } = await render(<ReactionPairsGame />)
	expect(getByText(/あかさんの番/)).toBeTruthy()

	// デッキは生成順のまま: カード1 = p1-a, カード2 = p1-b（ペア成立）
	await act(async () => {
		fireEvent.press(getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(getByLabelText('カード2'))
	})
	expect(getByText('誰が罰ゲーム！？')).toBeTruthy()

	// ルーレット消化（rng=0.9999 → floor(0.9999*2)=1 → あお が対象）
	// step 遷移ごとに useEffect が次のタイマーを張るので advance は2段階に分ける
	await act(async () => {
		jest.advanceTimersByTime(ROLL_MS)
	})
	await act(async () => {
		jest.advanceTimersByTime(LANDED_MS)
	})
	expect(getByText('あおさんが罰！')).toBeTruthy()

	await act(async () => {
		fireEvent.press(getByText('実行した！'))
	})
	expect(queryByText('あおさんが罰！')).toBeNull()
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('ラッキーをめくると発動カットインが出て、LUCKY_MS 後に消えて手番はそのまま', async () => {
	const { getByText, getByLabelText, queryByText } = await render(<ReactionPairsGame />)
	expect(getByText(/あかさんの番/)).toBeTruthy()

	// デッキは生成順のまま: カード16 = lucky
	await act(async () => {
		fireEvent.press(getByLabelText('カード16'))
	})
	expect(getByText('🍀 罰免除パスGET！')).toBeTruthy()

	await act(async () => {
		jest.advanceTimersByTime(LUCKY_MS)
	})
	expect(queryByText('🍀 罰免除パスGET！')).toBeNull()
	expect(getByText(/🍀 あか/)).toBeTruthy()
	expect(getByText(/あかさんの番/)).toBeTruthy()
})

it('不成立の2枚は MISMATCH_MS 後に裏へ戻り手番交代', async () => {
	const { getByText, getByLabelText } = await render(<ReactionPairsGame />)
	// カード1 = p1-a, カード3 = p2-a（不成立）
	await act(async () => {
		fireEvent.press(getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(getByLabelText('カード3'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MISMATCH_MS)
	})
	expect(getByText(/あおさんの番/)).toBeTruthy()
	expect(getByLabelText('カード1')).toBeTruthy() // 裏に戻っている
})

describe('ガラス面', () => {
	it('ヘッダーはガラス面で描画される', async () => {
		const { getByText } = await render(<ReactionPairsGame />)

		expect(hasAncestorTestId(getByText(/あかさんの番/), 'glass-surface-pseudo')).toBe(true)
	})
})
