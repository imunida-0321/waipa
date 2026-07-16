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

it('長押し中だけお題が表示され、離すと隠れる', async () => {
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
	const pad = getByLabelText('長押しで自分のお題を表示')
	await act(async () => {
		fireEvent(pad, 'pressIn')
	})
	expect(getByText('ラーメン')).toBeTruthy()
	await act(async () => {
		fireEvent(pad, 'pressOut')
	})
	expect(queryByText('ラーメン')).toBeNull()
})

it('一度確認するまで「次の人へ」は押せない', async () => {
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
	const pad = getByLabelText('長押しで自分のお題を表示')
	await act(async () => {
		fireEvent(pad, 'pressIn')
	})
	await act(async () => {
		fireEvent(pad, 'pressOut')
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
