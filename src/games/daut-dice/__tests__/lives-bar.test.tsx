import { render } from '@testing-library/react-native'
import { LivesBar } from '../lives-bar'

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		getUseOfValueInStyleWarning: jest.fn(),
	}
})

it('全員の名前とライフ（♥/💔）を表示する', async () => {
	const { getByText } = await render(
		<LivesBar names={['あか', 'あお', 'みどり']} lives={[3, 1, 0]} turnIndex={1} />,
	)
	expect(getByText('あか')).toBeTruthy()
	expect(getByText('♥♥♥')).toBeTruthy()
	expect(getByText('♥')).toBeTruthy()
	expect(getByText('💔')).toBeTruthy()
})
