import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { DrumrollReveal } from '../drumroll-reveal'

jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: () => <View testID="lottie-view" />,
	}
})
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
	}
})

it('rolling: 素材が登録されていれば Lottie を表示する', async () => {
	const { getByTestId, queryByText } = await render(<DrumrollReveal phase="rolling" />)
	expect(getByTestId('lottie-view')).toBeTruthy()
	expect(queryByText('？？？')).toBeNull()
})

it('rolling: lottie={false} なら素材があっても「？？？」を表示する', async () => {
	const { getByText, queryByTestId } = await render(
		<DrumrollReveal phase="rolling" lottie={false} />,
	)
	expect(getByText('？？？')).toBeTruthy()
	expect(queryByTestId('lottie-view')).toBeNull()
})

it('revealed: lottie={false} なら celebrate 素材を再生せず children のみ表示する', async () => {
	const { getByText, queryByTestId } = await render(
		<DrumrollReveal phase="revealed" lottie={false}>
			<Text>4.98秒</Text>
		</DrumrollReveal>,
	)
	expect(getByText('4.98秒')).toBeTruthy()
	expect(queryByTestId('lottie-view')).toBeNull()
})
