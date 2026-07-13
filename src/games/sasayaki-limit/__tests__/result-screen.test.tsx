import { fireEvent, render } from '@testing-library/react-native'
import { ResultScreen } from '../result-screen'

describe('ResultScreen', () => {
	const props = {
		names: ['あか', 'あお', 'きいろ'],
		successCounts: [2, 0, 3],
		losers: [1],
		onRetry: jest.fn(),
	}
	it('敗者名と全員の成功数が表示される', async () => {
		const { getByText, getByTestId } = await render(<ResultScreen {...props} />)
		expect(getByTestId('loser-name').props.children).toBe('あお')
		expect(getByText('2 / 3 成功')).toBeTruthy()
		expect(getByText('0 / 3 成功')).toBeTruthy()
	})
	it('もう一回で onRetry が呼ばれる', async () => {
		const { getByText } = await render(<ResultScreen {...props} />)
		fireEvent.press(getByText('もう一回あそぶ'))
		expect(props.onRetry).toHaveBeenCalled()
	})
})
