import { act, fireEvent, render } from '@testing-library/react-native'
import { playSound } from '@/lib/sound'
import { DiscussScreen } from '../discuss-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

beforeEach(() => {
	jest.useFakeTimers()
	;(playSound as jest.Mock).mockClear()
})
afterEach(() => {
	jest.useRealTimers()
})

it('残り時間を mm:ss で表示し、満了で onDone を1回だけ呼ぶ', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(<DiscussScreen seconds={61} onDone={onDone} />)
	expect(getByText('1:01')).toBeTruthy()
	await act(async () => {
		jest.advanceTimersByTime(61_000)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('残り10秒からチクタクが鳴る', async () => {
	await render(<DiscussScreen seconds={12} onDone={jest.fn()} />)
	await act(async () => {
		jest.advanceTimersByTime(1_000) // 残り11秒: まだ鳴らない
	})
	expect(playSound).not.toHaveBeenCalledWith('tick')
	await act(async () => {
		jest.advanceTimersByTime(1_000) // 残り10秒
	})
	expect(playSound).toHaveBeenCalledWith('tick')
})

it('「投票へすすむ」は2度押しで確定する', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(<DiscussScreen seconds={180} onDone={onDone} />)
	await act(async () => {
		fireEvent.press(getByText('投票へすすむ'))
	})
	expect(onDone).not.toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(getByText('もう一度タップで投票へ！'))
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('決選投票前の再議論では見出しが変わる', async () => {
	const { getByText } = await render(
		<DiscussScreen seconds={60} isRunoff onDone={jest.fn()} />,
	)
	expect(getByText(/決選投票/)).toBeTruthy()
})
