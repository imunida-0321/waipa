import { act, render } from '@testing-library/react-native'
import type { ReactTestInstance } from 'react-test-renderer'
import { LANDED_MS, PASS_PAUSE_MS, PlayerRoulette, REROLL_MS, ROLL_MS } from '../player-roulette'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))

const names = ['あか', 'あお', 'みどり']

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
})
afterEach(() => {
	jest.useRealTimers()
})

it('回転 → 停止 → 当選者表示のあと onDone が呼ばれる', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<PlayerRoulette
			names={names}
			firstIndex={1}
			finalIndex={1}
			passConsumed={false}
			onDone={onDone}
		/>,
	)
	await act(async () => {
		jest.advanceTimersByTime(ROLL_MS)
	})
	expect(getByText('あおさん！')).toBeTruthy()
	expect(onDone).not.toHaveBeenCalled()
	await act(async () => {
		jest.advanceTimersByTime(LANDED_MS)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('免除パス発動時は再抽選を挟んで finalIndex で確定する', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<PlayerRoulette
			names={names}
			firstIndex={0}
			finalIndex={2}
			passConsumed={true}
			onDone={onDone}
		/>,
	)
	await act(async () => {
		jest.advanceTimersByTime(ROLL_MS)
	})
	expect(getByText('🍀 免除パス発動！')).toBeTruthy()
	// step 遷移ごとに useEffect が次のタイマーを張るので、advance は段階ごとに分ける
	await act(async () => {
		jest.advanceTimersByTime(PASS_PAUSE_MS)
	})
	await act(async () => {
		jest.advanceTimersByTime(REROLL_MS)
	})
	expect(getByText('みどりさん！')).toBeTruthy()
	await act(async () => {
		jest.advanceTimersByTime(LANDED_MS)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('全員の名前が表示される', async () => {
	const { getAllByText } = await render(
		<PlayerRoulette
			names={names}
			firstIndex={0}
			finalIndex={0}
			passConsumed={false}
			onDone={jest.fn()}
		/>,
	)
	for (const n of names) {
		expect(getAllByText(n).length).toBeGreaterThanOrEqual(1)
	}
})

describe('ガラス面', () => {
	it('プレイヤー行はガラス面で描画される', async () => {
		const { getByText } = await render(
			<PlayerRoulette
				names={names}
				firstIndex={0}
				finalIndex={0}
				passConsumed={false}
				onDone={jest.fn()}
			/>,
		)

		expect(hasAncestorTestId(getByText('あお'), 'glass-surface-pseudo')).toBe(true)
	})
})
