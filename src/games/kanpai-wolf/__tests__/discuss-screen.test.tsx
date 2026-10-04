import { act, fireEvent, render } from '@testing-library/react-native'
import { haptics } from '@/lib/haptics'
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

		expect(
			hasAncestorTestId(getByText('誰かが質問されたら全員乾杯'), 'glass-surface-pseudo'),
		).toBe(true)
	})
})

describe('remaining effect の実行タイミング', () => {
	beforeEach(() => jest.clearAllMocks())

	it('5秒で半拍を追加し、props 変更や確認表示の再レンダーでは音・バイブを重複せず半拍も延期しない', async () => {
		const onDone = jest.fn()
		const { getByText, rerender } = await render(
			<DiscussScreen {...baseProps} seconds={6} onDone={onDone} />,
		)
		expect(jest.mocked(playSound).mock.calls).toEqual([['tick']])
		expect(haptics.tap).toHaveBeenCalledTimes(1)
		await act(async () => jest.advanceTimersByTime(999))
		expect(playSound).toHaveBeenCalledTimes(1) // 6秒では半拍なし
		await act(async () => jest.advanceTimersByTime(1))
		expect(getByText('0:05')).toBeTruthy()
		expect(playSound).toHaveBeenCalledTimes(2)
		expect(haptics.tap).toHaveBeenCalledTimes(2)
		await act(async () => jest.advanceTimersByTime(250))
		await rerender(
			<DiscussScreen
				{...baseProps}
				seconds={99}
				trigger="更新した乾杯ルール"
				kanpaiCount={1}
				onDone={jest.fn()}
			/>,
		)
		await act(async () => fireEvent.press(getByText('投票へすすむ')))
		expect(getByText('0:05')).toBeTruthy() // seconds の変更ではリセットしない
		expect(playSound).toHaveBeenCalledTimes(2)
		expect(haptics.tap).toHaveBeenCalledTimes(3) // tick 2回＋確認ボタン自体の tap
		await act(async () => jest.advanceTimersByTime(249))
		expect(playSound).toHaveBeenCalledTimes(2)
		await act(async () => jest.advanceTimersByTime(1))
		expect(jest.mocked(playSound).mock.calls).toEqual([['tick'], ['tick'], ['tick']])
		expect(haptics.tap).toHaveBeenCalledTimes(3) // 半拍は音だけ
		await act(async () => jest.advanceTimersByTime(500))
		expect(getByText('0:04')).toBeTruthy()
		expect(playSound).toHaveBeenCalledTimes(4)
		expect(haptics.tap).toHaveBeenCalledTimes(4)
		expect(onDone).not.toHaveBeenCalled()
	})

	it('満了時は最新の onDone を1回呼び、完了後の props 変更では再通知しない', async () => {
		const initialDone = jest.fn()
		const latestDone = jest.fn()
		const afterDone = jest.fn()
		const { rerender } = await render(
			<DiscussScreen {...baseProps} seconds={1} onDone={initialDone} />,
		)
		await act(async () => jest.advanceTimersByTime(500))
		await rerender(<DiscussScreen {...baseProps} seconds={1} onDone={latestDone} />)
		expect(initialDone).not.toHaveBeenCalled()
		expect(latestDone).not.toHaveBeenCalled()
		await act(async () => jest.advanceTimersByTime(499))
		expect(latestDone).not.toHaveBeenCalled()
		await act(async () => jest.advanceTimersByTime(1))
		expect(initialDone).not.toHaveBeenCalled()
		expect(latestDone).toHaveBeenCalledTimes(1)
		expect(haptics.heavy).toHaveBeenCalledTimes(1)
		await rerender(<DiscussScreen {...baseProps} seconds={20} onDone={afterDone} />)
		await act(async () => jest.advanceTimersByTime(20_000))
		expect(latestDone).toHaveBeenCalledTimes(1)
		expect(afterDone).not.toHaveBeenCalled()
		expect(haptics.heavy).toHaveBeenCalledTimes(1)
		expect(jest.mocked(playSound).mock.calls).toEqual([['tick'], ['tick']])
	})

	it('半拍待ちでアンマウントすると半拍音・カウントダウン・完了通知を取り消す', async () => {
		const onDone = jest.fn()
		const { unmount } = await render(
			<DiscussScreen {...baseProps} seconds={5} onDone={onDone} />,
		)
		await act(async () => jest.advanceTimersByTime(499))
		await unmount()
		await act(async () => jest.advanceTimersByTime(10_000))
		expect(jest.mocked(playSound).mock.calls).toEqual([['tick']])
		expect(haptics.tap).toHaveBeenCalledTimes(1)
		expect(haptics.heavy).not.toHaveBeenCalled()
		expect(onDone).not.toHaveBeenCalled()
	})
})
