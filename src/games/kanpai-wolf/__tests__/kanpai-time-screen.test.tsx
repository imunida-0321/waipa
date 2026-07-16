import { act, fireEvent, render } from '@testing-library/react-native'
import { KanpaiTimeScreen } from '../kanpai-time-screen'

let lastLottieProps: Record<string, unknown> | null = null
jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: (props: Record<string, unknown>) => {
			lastLottieProps = props
			return <View testID="lottie-view" />
		},
	}
})
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

beforeEach(() => {
	lastLottieProps = null
})

it('外したので乾杯を表示し、結果発表へで onDone を1回呼ぶ', async () => {
	const onDone = jest.fn()
	const { getByText, getByTestId } = await render(<KanpaiTimeScreen onDone={onDone} />)

	expect(getByText('外したので乾杯！')).toBeTruthy()
	expect(getByTestId('lottie-view')).toBeTruthy()
	expect(lastLottieProps?.loop).toBe(true)

	await act(async () => {
		fireEvent.press(getByText('結果発表へ'))
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})
