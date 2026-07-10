import { fireEvent, render } from '@testing-library/react-native'
import { PunishReveal } from '../punish-reveal'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('react-native-reanimated', () => ({
	__esModule: true,
	useAnimatedStyle: jest.fn(() => ({})),
	useSharedValue: jest.fn(() => ({ value: 0 })),
	withTiming: jest.fn((v) => v),
	getUseOfValueInStyleWarning: jest.fn(() => () => {}),
	createWorkletRuntime: jest.fn(),
	runOn: jest.fn((runtime, fn) => fn),
	runOnJS: jest.fn((fn) => fn),
}))
jest.mock('react-native-worklets', () => ({
	__esModule: true,
	Worklets: { defaultContext: {} },
}))

it('対象者名とお題を表示し「実行した！」で onDone', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<PunishReveal
			playerName="あお"
			playerIndex={1}
			topicText="一発ギャグをする"
			onDone={onDone}
		/>,
	)
	expect(getByText('あおさんが罰！')).toBeTruthy()
	expect(getByText('一発ギャグをする')).toBeTruthy()
	fireEvent.press(getByText('実行した！'))
	expect(onDone).toHaveBeenCalledTimes(1)
})
