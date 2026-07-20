import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactTestInstance } from 'react-test-renderer'
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

const baseProps = {
	trigger: '誰かが質問されたら全員乾杯',
	kanpaiCount: 0,
	onKanpai: jest.fn(),
}

function hasAncestorTestId(node: ReactTestInstance, testID: string): boolean {
	let current = node.parent
	while (current) {
		if (current.props.testID === testID) return true
		current = current.parent
	}
	return false
}

beforeEach(() => {
	jest.useFakeTimers()
	;(playSound as jest.Mock).mockClear()
})
afterEach(() => {
	jest.useRealTimers()
})

it('残り時間を mm:ss で表示し、満了で onDone を1回だけ呼ぶ', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<DiscussScreen seconds={61} onDone={onDone} {...baseProps} />,
	)
	expect(getByText('1:01')).toBeTruthy()
	await act(async () => {
		jest.advanceTimersByTime(61_000)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('残り10秒からチクタクが鳴る', async () => {
	await render(<DiscussScreen seconds={12} onDone={jest.fn()} {...baseProps} />)
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
	const { getByText } = await render(
		<DiscussScreen seconds={180} onDone={onDone} {...baseProps} />,
	)
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
		<DiscussScreen seconds={60} isRunoff onDone={jest.fn()} {...baseProps} />,
	)
	expect(getByText(/決選投票/)).toBeTruthy()
})

it('スキップ確定後はチクタクも onDone 再発火もしない', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<DiscussScreen seconds={180} onDone={onDone} {...baseProps} />,
	)
	await act(async () => {
		fireEvent.press(getByText('投票へすすむ'))
	})
	await act(async () => {
		fireEvent.press(getByText('もう一度タップで投票へ！'))
	})
	;(playSound as jest.Mock).mockClear()
	await act(async () => {
		jest.advanceTimersByTime(180_000)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
	expect(playSound).not.toHaveBeenCalledWith('tick')
})

it('残り5秒圏内でスキップしても半拍チクタクが残らない', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(<DiscussScreen seconds={4} onDone={onDone} {...baseProps} />)
	await act(async () => {
		jest.advanceTimersByTime(1_000) // 残り3秒: 半拍がスケジュールされる
	})
	await act(async () => {
		fireEvent.press(getByText('投票へすすむ'))
	})
	await act(async () => {
		fireEvent.press(getByText('もう一度タップで投票へ！'))
	})
	;(playSound as jest.Mock).mockClear()
	await act(async () => {
		jest.advanceTimersByTime(2_000)
	})
	expect(playSound).not.toHaveBeenCalledWith('tick')
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('乾杯ルールを常時表示する（runoff でも）', async () => {
	const ui = await render(<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} />)
	expect(ui.getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
	const runoff = await render(
		<DiscussScreen seconds={60} isRunoff onDone={jest.fn()} {...baseProps} />,
	)
	expect(runoff.getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
})

it('乾杯ボタンで onKanpai と cheers 効果音が発火する', async () => {
	const onKanpai = jest.fn()
	const { getByText } = await render(
		<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} onKanpai={onKanpai} />,
	)
	await act(async () => {
		fireEvent.press(getByText('🍻 乾杯！'))
	})
	expect(onKanpai).toHaveBeenCalledTimes(1)
	expect(playSound).toHaveBeenCalledWith('cheers')
})

it('乾杯回数が表示される（0回のときはバッジ非表示）', async () => {
	const ui = await render(
		<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} kanpaiCount={3} />,
	)
	expect(ui.getByText('× 3')).toBeTruthy()
	const zero = await render(<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} />)
	expect(zero.queryByText(/× \d/)).toBeNull()
})

describe('ガラス面', () => {
	it('乾杯ルールカードはガラス面で描画される', async () => {
		const { getByText } = await render(
			<DiscussScreen seconds={180} onDone={jest.fn()} {...baseProps} />,
		)

		expect(hasAncestorTestId(getByText('誰かが質問されたら全員乾杯'), 'glass-surface-pseudo')).toBe(
			true,
		)
	})
})
