import { act, fireEvent, render } from '@testing-library/react-native'
import type { State } from '../engine'
import { RoundResult } from '../round-result'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
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
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn(), linear: jest.fn() },
		getUseOfValueInStyleWarning: jest.fn(() => ''),
	}
})
jest.mock('@/theme/player-colors', () => ({
	PLAYER_COLORS: [
		{ name: '赤', value: '#FF3B5C' },
		{ name: '青', value: '#3B82F6' },
		{ name: '緑', value: '#22C55E' },
	],
	playerColor: (index: number) => ({
		name: '赤',
		value: '#FF3B5C',
	}),
}))

const base: State = {
	phase: 'result',
	turnIndex: 2,
	playerCount: 3,
	mines: [70, 65, 90],
	results: [
		{ score: 55, exploded: false },
		{ score: 65, exploded: true },
		{ score: 30, exploded: false },
	],
}

// RNTL v14 の要素型と react-test-renderer の型が非互換のため、必要な形だけの構造的型で受ける
type AncestorNode = { parent: AncestorNode | null; props: { testID?: unknown } }

function hasAncestorTestId(node: AncestorNode, testID: string): boolean {
	let current = node.parent
	while (current) {
		if (current.props.testID === testID) return true
		current = current.parent
	}
	return false
}

it('スコア順ランキングと地雷位置の答え合わせを表示する', async () => {
	const { getByText } = await render(
		<RoundResult
			state={base}
			names={['あか', 'あお', 'きいろ']}
			onRetry={() => {}}
			onHome={() => {}}
		/>,
	)
	expect(getByText(/あか/)).toBeTruthy()
	expect(getByText(/55/)).toBeTruthy()
	expect(getByText(/地雷: 70/)).toBeTruthy()
	expect(getByText(/💥/)).toBeTruthy() // 爆発者マーク
})

it('爆発者が敗者として表示される', async () => {
	const { getByText } = await render(
		<RoundResult
			state={base}
			names={['あか', 'あお', 'きいろ']}
			onRetry={() => {}}
			onHome={() => {}}
		/>,
	)
	expect(getByText(/あおさんの負け/)).toBeTruthy()
})

it('爆発者ゼロなら同率最低の全員が敗者表示される', async () => {
	const noBoom: State = {
		...base,
		results: [
			{ score: 20, exploded: false },
			{ score: 20, exploded: false },
			{ score: 50, exploded: false },
		],
	}
	const { getByText } = await render(
		<RoundResult
			state={noBoom}
			names={['あか', 'あお', 'きいろ']}
			onRetry={() => {}}
			onHome={() => {}}
		/>,
	)
	expect(getByText(/あか・あおさんの負け/)).toBeTruthy()
})

it('もう一回とホームのボタンが動く', async () => {
	const onRetry = jest.fn()
	const onHome = jest.fn()
	const { getByText } = await render(
		<RoundResult
			state={base}
			names={['あか', 'あお', 'きいろ']}
			onRetry={onRetry}
			onHome={onHome}
		/>,
	)
	await act(async () => {
		fireEvent.press(getByText('もう一回'))
	})
	await act(async () => {
		fireEvent.press(getByText('ホームへ'))
	})
	expect(onRetry).toHaveBeenCalledTimes(1)
	expect(onHome).toHaveBeenCalledTimes(1)
})

describe('ガラス面', () => {
	it('ランキング行はガラス面で描画される', async () => {
		const { getByText } = await render(
			<RoundResult
				state={base}
				names={['あか', 'あお', 'きいろ']}
				onRetry={() => {}}
				onHome={() => {}}
			/>,
		)

		expect(hasAncestorTestId(getByText(/地雷: 70/), 'glass-surface-pseudo')).toBe(true)
	})
})
