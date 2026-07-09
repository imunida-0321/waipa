import { act, render } from '@testing-library/react-native'
import { playSound } from '@/lib/sound'
import { haptics } from '@/lib/haptics'
import { CUTIN_DURATION_MS, EventCutin } from '../event-cutin'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
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
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
	}
})

beforeEach(() => {
	jest.useFakeTimers()
	jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

it('イベント名を表示し、効果音とバイブを鳴らす', async () => {
	const { getByText } = await render(<EventCutin event="shuffle" onDone={jest.fn()} />)
	expect(getByText('マスシャッフル')).toBeTruthy()
	expect(playSound).toHaveBeenCalledWith('event')
	expect(haptics.heavy).toHaveBeenCalled()
})

it('表示時間経過後に onDone が1回呼ばれる', async () => {
	const onDone = jest.fn()
	await render(<EventCutin event="double" onDone={onDone} />)
	expect(onDone).not.toHaveBeenCalled()
	await act(async () => {
		jest.advanceTimersByTime(CUTIN_DURATION_MS)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})
