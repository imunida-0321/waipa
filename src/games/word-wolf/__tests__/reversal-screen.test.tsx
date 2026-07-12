import { act, fireEvent, render } from '@testing-library/react-native'
import { ReversalScreen } from '../reversal-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('宣言前は市民のお題を見せない', async () => {
	const { getByText, queryByText } = await render(
		<ReversalScreen wolfName="あか" majorityWord="ラーメン" onJudge={jest.fn()} />,
	)
	expect(getByText(/逆転のチャンス/)).toBeTruthy()
	expect(queryByText('ラーメン')).toBeNull()
})

it('開けたら市民のお題と判定ボタンが出て、判定が渡る', async () => {
	const onJudge = jest.fn()
	const { getByText } = await render(
		<ReversalScreen wolfName="あか" majorityWord="ラーメン" onJudge={onJudge} />,
	)
	await act(async () => {
		fireEvent.press(getByText('宣言した！お題を開ける'))
	})
	expect(getByText('ラーメン')).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('当てた！'))
	})
	expect(onJudge).toHaveBeenCalledWith(true)
})
