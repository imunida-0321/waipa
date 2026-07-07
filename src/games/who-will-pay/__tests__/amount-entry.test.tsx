import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AmountEntry } from '../amount-entry'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))

beforeEach(async () => {
	await AsyncStorage.clear()
})

describe('金額入力画面', () => {
	it('数字ボタンを押すと金額が増える', async () => {
		const { getByText } = await render(<AmountEntry onConfirm={jest.fn()} />)
		await act(async () => {
			fireEvent.press(getByText('1'))
		})
		await act(async () => {
			fireEvent.press(getByText('2'))
		})
		await act(async () => {
			fireEvent.press(getByText('4'))
		})
		await waitFor(() => {
			expect(getByText('¥124')).toBeTruthy()
		})
	})

	it('確定を押して金額が0の場合は onConfirm が呼ばれない', async () => {
		const onConfirm = jest.fn()
		const { getByText } = await render(<AmountEntry onConfirm={onConfirm} />)
		await act(async () => {
			fireEvent.press(getByText('確定'))
		})
		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('確定を押して金額が0より大きい場合は onConfirm(amount) が呼ばれる', async () => {
		const onConfirm = jest.fn()
		const { getByText } = await render(<AmountEntry onConfirm={onConfirm} />)
		await act(async () => {
			fireEvent.press(getByText('1'))
		})
		await act(async () => {
			fireEvent.press(getByText('2'))
		})
		await act(async () => {
			fireEvent.press(getByText('4'))
		})
		await act(async () => {
			fireEvent.press(getByText('確定'))
		})
		expect(onConfirm).toHaveBeenCalledWith(124)
	})

	it('⌫で末尾の桁が消える', async () => {
		const { getByText } = await render(<AmountEntry onConfirm={jest.fn()} />)
		await act(async () => {
			fireEvent.press(getByText('1'))
		})
		await act(async () => {
			fireEvent.press(getByText('2'))
		})
		await act(async () => {
			fireEvent.press(getByText('⌫'))
		})
		await waitFor(() => {
			expect(getByText('¥1')).toBeTruthy()
		})
	})

	it('上限桁数を超える入力は無視される', async () => {
		const onConfirm = jest.fn()
		const { getByText } = await render(<AmountEntry onConfirm={onConfirm} />)
		for (let i = 0; i < 9; i++) {
			await act(async () => {
				fireEvent.press(getByText('9'))
			})
		}
		await act(async () => {
			fireEvent.press(getByText('確定'))
		})
		expect(onConfirm).toHaveBeenCalledWith(9999999)
	})
})
