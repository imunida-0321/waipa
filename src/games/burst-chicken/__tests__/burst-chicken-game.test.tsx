import { act, fireEvent, render } from '@testing-library/react-native'
import { BurstChickenGame } from '../burst-chicken-game'

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
	}
})

// Math.random を 0.9999… に固定 → limit は常に 30（バーストさせないテスト用）
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0.9999999)
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

it('初期表示: 合計0・先頭プレイヤーの手番・上限ヒント', async () => {
	const { getByText } = await render(<BurstChickenGame />)
	expect(getByText('0')).toBeTruthy()
	expect(getByText(/あかさんの番/)).toBeTruthy()
	expect(getByText(/上限は 21〜30 のどこか/)).toBeTruthy()
})

it('+3 で合計が増えて手番が交代する', async () => {
	const { getByText, getByLabelText } = await render(<BurstChickenGame />)
	await press(getByLabelText('+3'))
	expect(getByText('3')).toBeTruthy()
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('ストップは合計15未満では出ず、15で出現する', async () => {
	const { getByLabelText, queryByText, getByText } = await render(<BurstChickenGame />)
	for (let i = 0; i < 4; i++) {
		await press(getByLabelText('+3')) // 12
	}
	expect(queryByText(/ストップ宣言/)).toBeNull()
	await press(getByLabelText('+3')) // 15
	expect(getByText(/ストップ宣言/)).toBeTruthy()
})
