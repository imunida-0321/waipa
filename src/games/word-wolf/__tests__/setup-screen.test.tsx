import { act, fireEvent, render } from '@testing-library/react-native'
import { SetupScreen } from '../setup-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

it('デフォルト設定（ウルフ1・3分・たべもの）で開始できる', async () => {
	const onStart = jest.fn()
	const { getByText } = await render(<SetupScreen playerCount={5} onStart={onStart} />)
	await act(async () => {
		fireEvent.press(getByText('はじめる'))
	})
	expect(onStart).toHaveBeenCalledWith({ wolfCount: 1, discussSeconds: 180, pack: 'food' })
})

it('6人以下ではウルフ2人の選択肢が出ない', async () => {
	const { queryByText } = await render(<SetupScreen playerCount={6} onStart={jest.fn()} />)
	expect(queryByText('2人')).toBeNull()
})

it('7人以上でウルフ2人・時間・パックを選んで開始できる', async () => {
	const onStart = jest.fn()
	const { getByText } = await render(<SetupScreen playerCount={7} onStart={onStart} />)
	await act(async () => {
		fireEvent.press(getByText('2人'))
	})
	await act(async () => {
		fireEvent.press(getByText('5分'))
	})
	await act(async () => {
		fireEvent.press(getByText('ばしょ'))
	})
	await act(async () => {
		fireEvent.press(getByText('はじめる'))
	})
	expect(onStart).toHaveBeenCalledWith({ wolfCount: 2, discussSeconds: 300, pack: 'place' })
})
