import { act, fireEvent, render } from '@testing-library/react-native'
import { RevealOverlay } from '../reveal-overlay'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

it('ドラムロール中は正体を見せず、2秒後にウルフ発表', async () => {
	const onDone = jest.fn()
	const { getByText, queryByText } = await render(
		<RevealOverlay name="あか" wasWolf onDone={onDone} />,
	)
	expect(getByText(/運命の開票/)).toBeTruthy()
	expect(queryByText(/ウルフ！/)).toBeNull()
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	expect(getByText(/あかさんは/)).toBeTruthy()
	expect(getByText(/🐺 ウルフ！/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('逆転チャンスへ'))
	})
	expect(onDone).toHaveBeenCalled()
})

it('市民だった場合は「結果発表へ」', async () => {
	const { getByText } = await render(
		<RevealOverlay name="あお" wasWolf={false} onDone={jest.fn()} />,
	)
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	expect(getByText(/市民でした/)).toBeTruthy()
	expect(getByText('結果発表へ')).toBeTruthy()
})
