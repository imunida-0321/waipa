import { act, fireEvent, render } from '@testing-library/react-native'
import { CALIBRATION_MS } from '../engine'
import { CalibrationScreen } from '../calibration-screen'

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

describe('CalibrationScreen', () => {
	it('3秒間サンプリング後にスタート・再計測ボタンが出て、スタートでノイズフロアを返す', async () => {
		const onConfirm = jest.fn()
		const { getByText, queryByText } = await render(
			<CalibrationScreen levelDb={-42} onConfirm={onConfirm} />,
		)
		expect(queryByText('スタート')).toBeNull()
		await act(async () => {
			jest.advanceTimersByTime(CALIBRATION_MS + 100)
		})
		expect(getByText('スタート')).toBeTruthy()
		await act(async () => {
			fireEvent.press(getByText('スタート'))
		})
		expect(onConfirm).toHaveBeenCalledWith(-42)
	})
	it('再計測でサンプリングをやり直す', async () => {
		const { getByText, queryByText } = await render(
			<CalibrationScreen levelDb={-42} onConfirm={jest.fn()} />,
		)
		await act(async () => {
			jest.advanceTimersByTime(CALIBRATION_MS + 100)
		})
		await act(async () => {
			fireEvent.press(getByText('再計測'))
		})
		expect(queryByText('スタート')).toBeNull()
	})
})
