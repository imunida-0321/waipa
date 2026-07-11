import { act, fireEvent, render } from '@testing-library/react-native'
import type { State } from '../engine'
import { RoundResult } from '../round-result'

// GradientButton が @/lib/haptics 経由で AsyncStorage / expo-haptics に依存するため、
// 他の GradientButton 利用テスト（src/components/ui/__tests__/buttons.test.tsx）と同じ規約でモックする
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
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
// jest 環境では react-native-reanimated のネイティブ worklets モジュールが解決できないため、
// 他の GradientButton 利用テスト（chinchiro/__tests__/result.test.tsx 等）と同じ規約でモックする
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
	}
})

const names = ['あか', 'あお', 'みどり']

const explodedState: State = {
	phase: 'exploded',
	limit: 24,
	total: 25,
	turnIndex: 1,
	startIndex: 0,
	playerCount: 3,
	contributions: [9, 10, 6],
	losers: [1],
	stopperIndex: null,
}

const settledTieState: State = {
	phase: 'settled',
	limit: 28,
	total: 16,
	turnIndex: 2,
	startIndex: 0,
	playerCount: 3,
	contributions: [4, 4, 8],
	losers: [0, 1],
	stopperIndex: 2,
}

it('バースト: 敗者名・上限の答え合わせ・全員の貢献を表示する', async () => {
	const { getByText } = await render(
		<RoundResult state={explodedState} names={names} onRetry={jest.fn()} onHome={jest.fn()} />,
	)
	expect(getByText(/あおさんの負け/)).toBeTruthy()
	expect(getByText(/上限は 24 だった/)).toBeTruthy()
	expect(getByText(/あか/)).toBeTruthy()
	expect(getByText(/6pt/)).toBeTruthy() // 貢献ポイント表示
})

it('精算タイ: タイ全員の名前を敗者として表示する', async () => {
	const { getByText } = await render(
		<RoundResult
			state={settledTieState}
			names={names}
			onRetry={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	expect(getByText(/あかさん、あおさんの負け/)).toBeTruthy()
	expect(getByText(/上限は 28 だった/)).toBeTruthy()
})

it('もう一回 / ホームへ がコールバックを呼ぶ', async () => {
	const onRetry = jest.fn()
	const onHome = jest.fn()
	const { getByText } = await render(
		<RoundResult state={explodedState} names={names} onRetry={onRetry} onHome={onHome} />,
	)
	await act(async () => {
		fireEvent.press(getByText('もう一回'))
	})
	expect(onRetry).toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(getByText('ホームへ'))
	})
	expect(onHome).toHaveBeenCalled()
})
