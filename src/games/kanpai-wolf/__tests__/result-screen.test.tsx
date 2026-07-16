import { render } from '@testing-library/react-native'
import { ResultScreen } from '../result-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

const words = { majority: 'ラーメン', wolf: 'うどん' }

it('勝敗・お題・乾杯回数を表示する', async () => {
	const { getByText } = await render(
		<ResultScreen
			outcome="citizens"
			wolfNames={['あか']}
			words={words}
			kanpaiCount={3}
			onRetry={jest.fn()}
		/>,
	)
	expect(getByText(/市民チームの勝利/)).toBeTruthy()
	expect(getByText('市民チームの勝利！')).toBeTruthy()
	expect(getByText('ウルフ: あか')).toBeTruthy()
	expect(getByText('市民のお題: ラーメン')).toBeTruthy()
	expect(getByText('ウルフのお題: うどん')).toBeTruthy()
	expect(getByText('このラウンドの乾杯 🍻 × 3回')).toBeTruthy()
})

it('0回でも乾杯行を表示する', async () => {
	const { getByText } = await render(
		<ResultScreen
			outcome="wolf"
			wolfNames={['あか']}
			words={words}
			kanpaiCount={0}
			onRetry={jest.fn()}
		/>,
	)
	expect(getByText('ウルフの勝利！')).toBeTruthy()
	expect(getByText('このラウンドの乾杯 🍻 × 0回')).toBeTruthy()
})
