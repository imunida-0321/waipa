import { render } from '@testing-library/react-native'
import type { ReactTestInstance } from 'react-test-renderer'
import { ResultScreen } from '../result-screen'

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
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
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

describe('ガラス面', () => {
	it('ライフ行はガラス面で描画される', async () => {
		const { getByText } = await render(
			<ResultScreen
				names={['あか', 'あお', 'みどり']}
				lives={[0, 2, 1]}
				loserIndex={0}
				onRetry={jest.fn()}
				onHome={jest.fn()}
			/>,
		)

		expect(hasAncestorTestId(getByText('あお'), 'glass-surface-pseudo')).toBe(true)
	})
})
