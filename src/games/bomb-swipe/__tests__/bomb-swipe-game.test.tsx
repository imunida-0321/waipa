import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactTestInstance } from 'react-test-renderer'
import { BombSwipeGame } from '../bomb-swipe-game'

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
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((v: number) => v),
		withSequence: jest.fn((v: number) => v),
		withSpring: jest.fn((v: number) => v),
		// round-result.tsx が playerColor(...).value をスタイル内で直接参照するため、
		// reanimated babel プラグインが挿入するチェック関数もモックしておく（round-result.test.tsx と同様）
		getUseOfValueInStyleWarning: jest.fn(() => ''),
	}
})
// ゲージは単体テスト済みのためモックし、離した位置を直接注入する
// jest.mock のファクトリはトップスコープの変数を参照できないため、react-native を内部で require する
jest.mock('../gauge', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		SwipeGauge: ({
			onScoreChange,
			onRelease,
		}: {
			onScoreChange: (score: number) => void
			onRelease: (score: number) => void
		}) => (
			<>
				{/* onScoreChange を直接注入するための任意スコアボタン群（バケット跨ぎ検証用） */}
				<Pressable testID="mock-score-15" onPress={() => onScoreChange(15)}>
					<Text>score15</Text>
				</Pressable>
				<Pressable testID="mock-score-18" onPress={() => onScoreChange(18)}>
					<Text>score18</Text>
				</Pressable>
				<Pressable testID="mock-score-25" onPress={() => onScoreChange(25)}>
					<Text>score25</Text>
				</Pressable>
				<Pressable testID="mock-release-50" onPress={() => onRelease(50)}>
					<Text>release50</Text>
				</Pressable>
				<Pressable testID="mock-release-60" onPress={() => onRelease(60)}>
					<Text>release60</Text>
				</Pressable>
			</>
		),
	}
})

// Math.random=0 → 全員の地雷が 60 に固定（score 60 で必ず爆発、59 以下でセーフ）
beforeEach(() => {
	jest.clearAllMocks()
	jest.spyOn(Math, 'random').mockReturnValue(0)
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

async function press(target: Parameters<typeof fireEvent.press>[0]) {
	await act(async () => {
		fireEvent.press(target)
	})
}

function hasAncestorTestId(node: ReactTestInstance, testID: string): boolean {
	let current = node.parent
	while (current) {
		if (current.props.testID === testID) return true
		current = current.parent
	}
	return false
}

type TrialStoreModule = {
	useTrialRoundConsumer: (gameId: string, isRoundEnd: boolean) => void
}

function spyTrialRoundConsumer() {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const module = require('@/lib/trial-store') as TrialStoreModule
	return jest.spyOn(module, 'useTrialRoundConsumer').mockImplementation(() => {})
}

it('初期表示: 先頭プレイヤーの手番表示と開始ボタン', async () => {
	const { getByText } = await render(<BombSwipeGame />)
	expect(getByText(/あかさんの番/)).toBeTruthy()
	expect(getByText(/スワイプ開始/)).toBeTruthy()
})

it('開始→地雷未満で離すとセーフ表示、次へで手番交代', async () => {
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-50'))
	expect(getByText(/50/)).toBeTruthy()
	expect(getByText(/セーフ/)).toBeTruthy()
	await press(getByText(/次へ/))
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('地雷ちょうどで離すと爆発表示になり explosion が鳴る', async () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { playSound } = require('@/lib/sound')
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-60'))
	expect(getByText(/爆発/)).toBeTruthy()
	expect(playSound).toHaveBeenCalledWith('explosion')
})

it('同一10点バケット内の連続 onScoreChange では心音が1回だけ、バケットを跨ぐと再度鳴る', async () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { playSound } = require('@/lib/sound')
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { haptics } = require('@/lib/haptics')
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/)) // このボタン押下自体でも haptics.tap が1回呼ばれる

	const heartbeatCalls = () =>
		(playSound as jest.Mock).mock.calls.filter(([sound]) => sound === 'heartbeat').length
	const tapCallsBeforeScoring = (haptics.tap as jest.Mock).mock.calls.length

	// score 15 → 18 はどちらもバケット1（floor(score/10)）: 心音は最初の1回だけ
	await press(getByTestId('mock-score-15'))
	await press(getByTestId('mock-score-18'))
	expect(heartbeatCalls()).toBe(1)
	expect((haptics.tap as jest.Mock).mock.calls.length - tapCallsBeforeScoring).toBe(1)

	// score 25 はバケット2に跨ぐため再度鳴る
	await press(getByTestId('mock-score-25'))
	expect(heartbeatCalls()).toBe(2)
	expect((haptics.tap as jest.Mock).mock.calls.length - tapCallsBeforeScoring).toBe(2)
})

it('全員終了でリザルトに敗者と答え合わせが表示される', async () => {
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-50')) // あか: 50 セーフ
	await press(getByText(/次へ/))
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-60')) // あお: 60 爆発
	await press(getByText(/次へ/))
	await act(async () => {
		jest.advanceTimersByTime(3000) // ドラムロール消化
	})
	expect(getByText(/あおさんの負け/)).toBeTruthy()
})

it('決着画面到達でトライアルの1ラウンドを消費する', async () => {
	const consumerSpy = spyTrialRoundConsumer()
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-50'))
	await press(getByText(/次へ/))
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-60'))
	await press(getByText(/次へ/))
	await act(async () => {
		jest.advanceTimersByTime(3000)
	})

	expect(getByText(/あおさんの負け/)).toBeTruthy()
	expect(consumerSpy).toHaveBeenCalledWith('bomb-swipe', true)
})

describe('ガラス面', () => {
	it('手番行はガラス面で描画される', async () => {
		const { getByText } = await render(<BombSwipeGame />)

		expect(hasAncestorTestId(getByText(/あかさんの番/), 'glass-surface-pseudo')).toBe(true)
	})
})
