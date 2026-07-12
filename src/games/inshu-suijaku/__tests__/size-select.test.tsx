import { act, fireEvent, render } from '@testing-library/react-native'
import { SizeSelect } from '../size-select'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('3サイズが表示され、選択してスタートすると onStart が呼ばれる', async () => {
	const onStart = jest.fn()
	const utils = await render(<SizeSelect onStart={onStart} />)
	expect(utils.getByText(/小 4×4/)).toBeTruthy()
	expect(utils.getByText(/中 4×5/)).toBeTruthy()
	expect(utils.getByText(/大 5×6/)).toBeTruthy()
	expect(utils.getByText(/7ペア/)).toBeTruthy()

	await act(async () => {
		fireEvent.press(utils.getByText(/中 4×5/))
	})
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(onStart).toHaveBeenCalledWith('medium')
})

it('未選択でもデフォルト（小）でスタートできる', async () => {
	const onStart = jest.fn()
	const utils = await render(<SizeSelect onStart={onStart} />)
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(onStart).toHaveBeenCalledWith('small')
})
