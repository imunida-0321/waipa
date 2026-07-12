import { act, fireEvent, render } from '@testing-library/react-native'
import type { Card } from '../engine'
import { MATCH_ANIM_MS } from '../card-grid'
import { MISMATCH_MS, InshuSuijakuGame } from '../inshu-suijaku-game'

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
jest.mock('expo-image', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { Image: View }
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
		withSpring: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, animation: unknown) => animation),
		getUseOfValueInStyleWarning: jest.fn(),
	}
})
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 3, names: ['あか', 'あお', 'みどり'], history: [] }),
	getDisplayNames: () => ['あか', 'あお', 'みどり'],
}))

jest.mock('../engine', () => {
	const actual = jest.requireActual('../engine')
	// 固定ミニデッキ: 2ペア＋ジョーカー1枚（カード1〜5 = p1-a, p1-b, p2-a, p2-b, joker-1）
	function mockFixedDeck(): Card[] {
		const base = {
			punishmentId: 'n07',
			punishment: '全員と乾杯して1杯',
			state: 'hidden' as const,
		}
		const base2 = {
			punishmentId: 'n01',
			punishment: '1杯飲む',
			state: 'hidden' as const,
		}
		return [
			{ id: 'p1-a', pairId: 'p1', rank: '7', suit: '♥', ...base },
			{ id: 'p1-b', pairId: 'p1', rank: '7', suit: '♥', ...base },
			{ id: 'p2-a', pairId: 'p2', rank: 'Q', suit: '♦', ...base2 },
			{ id: 'p2-b', pairId: 'p2', rank: 'Q', suit: '♦', ...base2 },
			{
				id: 'joker-1',
				pairId: null,
				rank: 'JOKER',
				suit: null,
				punishmentId: 's01',
				punishment: 'グラスの残りを飲み干す（無理は禁物！）',
				state: 'hidden',
			},
		]
	}
	return { ...actual, createDeck: jest.fn(() => mockFixedDeck()) }
})

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

async function startGame(utils: Awaited<ReturnType<typeof render>>) {
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(utils.getByText(/あかさんの番/)).toBeTruthy()
	// テスト環境では onLayout が自動発火しないため、実測相当のレイアウトを手動で発火する
	await act(async () => {
		fireEvent(utils.getByTestId('ns-card-grid'), 'layout', {
			nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 600 } },
		})
	})
}

it('サイズ選択 → play: 秘匿された盤面が出る', async () => {
	const utils = await render(<InshuSuijakuGame />)
	expect(utils.getByText('盤面サイズをえらぼう')).toBeTruthy()
	await startGame(utils)
	expect(utils.queryByText('全員と乾杯して1杯')).toBeNull() // 罰は秘匿
})

it('ペア成立: クロスフェード → 罰発表 → 実行した！で次の人へ', async () => {
	const utils = await render(<InshuSuijakuGame />)
	await startGame(utils)
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード2'))
	})
	// matchAnim 中: カード上にうっすら罰テキスト（2枚分）
	expect(utils.getAllByText('全員と乾杯して1杯').length).toBeGreaterThanOrEqual(2)
	await act(async () => {
		jest.advanceTimersByTime(MATCH_ANIM_MS)
	})
	// punish オーバーレイ
	expect(utils.getByText(/あかさん、誰にやらせる？/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	expect(utils.getByText(/あおさんの番/)).toBeTruthy()
})

it('不成立: 約1.5秒後に裏へ戻り次の人へ', async () => {
	const utils = await render(<InshuSuijakuGame />)
	await startGame(utils)
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード3'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MISMATCH_MS)
	})
	expect(utils.getByText(/あおさんの番/)).toBeTruthy()
})

it('ジョーカー → 特大罰 → 全ペア消化で結果発表まで通る', async () => {
	const utils = await render(<InshuSuijakuGame />)
	await startGame(utils)
	// あか: ジョーカー（本人実行・手番終了）
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード5'))
	})
	expect(utils.getByText(/特大罰/)).toBeTruthy()
	expect(utils.getByText(/あかさんが実行！/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	// あお: p1 を揃える
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード2'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MATCH_ANIM_MS)
	})
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	// みどり: p2 を揃えて全ペア消化
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード3'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード4'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MATCH_ANIM_MS)
	})
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	expect(utils.getByText('🏆 結果発表')).toBeTruthy()
	expect(utils.getAllByText(/最下位/).length).toBeGreaterThanOrEqual(1)
})
