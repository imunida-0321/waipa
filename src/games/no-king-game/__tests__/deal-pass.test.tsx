import { act, fireEvent, render } from '@testing-library/react-native'
import { haptics } from '@/lib/haptics'
import { DealPass } from '../deal-pass'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('@/components/ui/gradient-button', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		GradientButton: ({
			title,
			onPress,
			disabled,
		}: {
			title: string
			onPress: () => void
			disabled?: boolean
		}) => (
			<Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
				<Text>{title}</Text>
			</Pressable>
		),
	}
})

describe('DealPass', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('長押し前は番号を隠し確認操作を受け付けない', async () => {
		const onConfirm = jest.fn()
		const { getByText, getByLabelText, queryByText } = await render(
			<DealPass round={1} dealIndex={0} playerCount={4} number={3} onConfirm={onConfirm} />,
		)

		expect(getByText('ROUND 1')).toBeTruthy()
		expect(getByText(/1人目の人にスマホを渡してください/)).toBeTruthy()
		expect(getByText('長押しで自分の番号を表示')).toBeTruthy()
		expect(queryByText('3番')).toBeNull()

		await act(async () => {
			fireEvent.press(getByText('確認した（次の人へ）'))
		})

		expect(onConfirm).not.toHaveBeenCalled()
		expect(getByLabelText('長押しで自分の番号を表示')).toBeTruthy()
	})

	it('長押し中だけ番号を表示し、離した後に確認できる', async () => {
		const onConfirm = jest.fn()
		const { getByText, getByLabelText, queryByText } = await render(
			<DealPass round={2} dealIndex={1} playerCount={4} number={7} onConfirm={onConfirm} />,
		)
		const pad = getByLabelText('長押しで自分の番号を表示')

		await act(async () => {
			fireEvent(pad, 'pressIn')
		})
		expect(getByText('7番')).toBeTruthy()
		expect(haptics.tap).toHaveBeenCalledTimes(1)

		await act(async () => {
			fireEvent(pad, 'pressOut')
		})
		expect(queryByText('7番')).toBeNull()

		await act(async () => {
			fireEvent.press(getByText('確認した（次の人へ）'))
		})
		expect(onConfirm).toHaveBeenCalledTimes(1)
	})

	it('最後の参加者では発表へ進むラベルを表示する', async () => {
		const { getByText } = await render(
			<DealPass round={1} dealIndex={3} playerCount={4} number={4} onConfirm={jest.fn()} />,
		)

		expect(getByText('確認した（発表へ！）')).toBeTruthy()
	})
})
