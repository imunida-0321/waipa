import { act, fireEvent, render } from '@testing-library/react-native'
import { DealPass } from '../deal-pass'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('タップで表示、もう一度タップで隠す', async () => {
	const { getByText, queryByText, getByLabelText } = await render(
		<DealPass
			dealIndex={0}
			playerCount={3}
			name="あか"
			word="ラーメン"
			onConfirm={jest.fn()}
		/>,
	)
	// 長押し前はお題が漏れない
	expect(queryByText('ラーメン')).toBeNull()
	expect(queryByText('🤫')).toBeNull()
	const pad = getByLabelText('タップで自分のお題を表示')
	await act(async () => {
		fireEvent.press(pad)
	})
	expect(getByText('ラーメン')).toBeTruthy()
	await act(async () => {
		fireEvent.press(pad)
	})
	expect(queryByText('ラーメン')).toBeNull()
})

it('一度表示し、隠すまで「次の人へ」は押せない', async () => {
	const onConfirm = jest.fn()
	const { getByText, getByLabelText } = await render(
		<DealPass
			dealIndex={0}
			playerCount={3}
			name="あか"
			word="ラーメン"
			onConfirm={onConfirm}
		/>,
	)
	await act(async () => {
		fireEvent.press(getByText('確認した（次の人へ）'))
	})
	expect(onConfirm).not.toHaveBeenCalled()
	const pad = getByLabelText('タップで自分のお題を表示')
	await act(async () => {
		fireEvent.press(pad)
	})
	await act(async () => {
		fireEvent.press(getByText('確認した（次の人へ）'))
	})
	expect(onConfirm).not.toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(pad)
	})
	await act(async () => {
		fireEvent.press(getByText('確認した（次の人へ）'))
	})
	expect(onConfirm).toHaveBeenCalled()
})

it('最後の人はボタン文言が「乾杯ルールへ」になる', async () => {
	const { getByText } = await render(
		<DealPass dealIndex={2} playerCount={3} name="き" word="うどん" onConfirm={jest.fn()} />,
	)
	expect(getByText('確認した（乾杯ルールへ！）')).toBeTruthy()
})
