import { act, fireEvent, render } from '@testing-library/react-native'
import { RevealOverlay } from '../reveal-overlay'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { __esModule: true, default: View }
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
	}
})
jest.mock('../dice-roll-3d', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { DiceRoll3D: View, ROLL_ANIM_MS: 1200 }
})

const base = {
	declaration: 66,
	actual: { d1: 3, d2: 5, value: 53 },
	lifeLoserName: 'あか',
	onDone: jest.fn(),
}

beforeEach(() => {
	jest.useFakeTimers()
	jest.clearAllMocks()
})
afterEach(() => {
	jest.useRealTimers()
})

it('ドラムロール後に嘘判定とライフ-1 を発表し、つぎへで onDone', async () => {
	const { getByText, queryByText } = await render(
		<RevealOverlay {...base} wasBluff gameOver={false} />,
	)
	expect(queryByText(/ウソ/)).toBeNull() // ドラムロール中
	await act(async () => {
		jest.advanceTimersByTime(2000) // useDrumroll の既定 durationMs
	})
	expect(getByText(/ウソだった/)).toBeTruthy()
	expect(getByText(/あかさん ライフ-1/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('つぎへ'))
	})
	expect(base.onDone).toHaveBeenCalled()
})

it('本当のときはダウト失敗の発表・gameOver では「結果へ」', async () => {
	const { getByText } = await render(<RevealOverlay {...base} wasBluff={false} gameOver />)
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	expect(getByText(/ホントだった/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('結果へ'))
	})
	expect(base.onDone).toHaveBeenCalled()
})
