import { render } from '@testing-library/react-native'
import type { ReactTestInstance } from 'react-test-renderer'
import { Result } from '../result'
import type { DigitSlot } from '../payment'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
// inline requires により player-colors 経由で reanimated が遅延ロードされるためスタブする
// （who-will-pay-game.test.tsx と同じモック）
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
		runOnJS: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
		getUseOfValueInStyleWarning: jest.fn(() => ''),
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

const slots: DigitSlot[] = [
	{ index: 0, char: '1', place: 1000, value: 1000, playerIndex: 0 },
	{ index: 1, char: '2', place: 100, value: 200, playerIndex: 1 },
	{ index: 2, char: '0', place: 10, value: 0, playerIndex: null },
]

describe('ガラス面', () => {
	it('summaryはガラス面で描画される', async () => {
		const { getByText } = await render(
			<Result
				slots={slots}
				playerNames={['アオイ', 'ミキ']}
				onRetry={jest.fn()}
				onHome={jest.fn()}
			/>,
		)

		expect(hasAncestorTestId(getByText('¥1,000'), 'glass-surface-pseudo')).toBe(true)
	})
})
