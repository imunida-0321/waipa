import { act, render } from '@testing-library/react-native'
import { withSequence, withTiming } from 'react-native-reanimated'
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
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { useRef } = require('react') as typeof import('react')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: (initial: number) => useRef({ value: initial }).current,
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

// RNTL v14 の要素型と react-test-renderer の型が非互換のため、必要な形だけの構造的型で受ける
type AncestorNode = { parent: AncestorNode | null; props: { testID?: unknown } }

function hasAncestorTestId(node: AncestorNode, testID: string): boolean {
	let current = node.parent
	while (current) {
		if (current.props.testID === testID) return true
		current = current.parent
	}
	return false
}

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

it('アンマウント後はタイマーが発火せず onDone は呼ばれない', async () => {
	const onDone = jest.fn()
	const { unmount } = await render(<EventCutin event="vanish" onDone={onDone} />)
	await unmount()
	await act(async () => {
		jest.advanceTimersByTime(CUTIN_DURATION_MS)
	})
	expect(onDone).not.toHaveBeenCalled()
})

describe('ガラス面', () => {
	it('イベントカットインのパネルはガラス面で描画される', async () => {
		const { getByText } = await render(<EventCutin event="shuffle" onDone={jest.fn()} />)

		expect(hasAncestorTestId(getByText('マスシャッフル'), 'glass-surface-blur')).toBe(true)
	})
})

it('event・onDone が変わっても演出を再開せず、初回の onDone をマウントから1400ms後に1回呼ぶ', async () => {
	const initialDone = jest.fn()
	const latestDone = jest.fn()
	const { rerender, getByText } = await render(<EventCutin event="double" onDone={initialDone} />)
	await act(async () => jest.advanceTimersByTime(400))
	await rerender(<EventCutin event="shuffle" onDone={latestDone} />)
	expect(getByText('マスシャッフル')).toBeTruthy()
	expect(jest.mocked(playSound).mock.calls).toEqual([['event']])
	expect(haptics.heavy).toHaveBeenCalledTimes(1)
	expect(withSequence).toHaveBeenCalledTimes(1)
	expect(withTiming).toHaveBeenCalledTimes(2)
	await act(async () => jest.advanceTimersByTime(CUTIN_DURATION_MS - 401))
	expect(initialDone).not.toHaveBeenCalled()
	expect(latestDone).not.toHaveBeenCalled()
	await act(async () => jest.advanceTimersByTime(1))
	expect(initialDone).toHaveBeenCalledTimes(1)
	expect(latestDone).not.toHaveBeenCalled()
	await rerender(<EventCutin event="shuffle" onDone={latestDone} />)
	await act(async () => jest.advanceTimersByTime(CUTIN_DURATION_MS * 2))
	expect(initialDone).toHaveBeenCalledTimes(1)
	expect(latestDone).not.toHaveBeenCalled()
	expect(jest.mocked(playSound).mock.calls).toEqual([['event']])
	expect(haptics.heavy).toHaveBeenCalledTimes(1)
	expect(withSequence).toHaveBeenCalledTimes(1)
	expect(withTiming).toHaveBeenCalledTimes(2)
})
