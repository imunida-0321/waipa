import { act, fireEvent, render } from '@testing-library/react-native'
import { VoteScreen } from '../vote-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('@/theme/player-colors', () => ({
	playerColor: jest.fn((i) => ({ name: `player${i}`, value: '#FF0000' })),
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

const names = ['あか', 'あお', 'き']

async function toChoose(ui: Awaited<ReturnType<typeof render>>) {
	await act(async () => {
		fireEvent.press(ui.getByText('投票する'))
	})
}

it('ハンドオーバー画面から始まり、候補に自分が出ない', async () => {
	const ui = await render(
		<VoteScreen
			voterIndex={0}
			voterName="あか"
			names={names}
			candidates={null}
			onVote={jest.fn()}
		/>,
	)
	expect(ui.getByText(/あかさんにスマホを渡して/)).toBeTruthy()
	await toChoose(ui)
	expect(ui.queryByText('あか')).toBeNull()
	expect(ui.getByText('あお')).toBeTruthy()
	expect(ui.getByText('き')).toBeTruthy()
})

it('選択→確定で onVote が呼ばれる。未選択では確定できない', async () => {
	const onVote = jest.fn()
	const ui = await render(
		<VoteScreen
			voterIndex={0}
			voterName="あか"
			names={names}
			candidates={null}
			onVote={onVote}
		/>,
	)
	await toChoose(ui)
	await act(async () => {
		fireEvent.press(ui.getByText('投票する'))
	})
	expect(onVote).not.toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(ui.getByText('あお'))
	})
	await act(async () => {
		fireEvent.press(ui.getByText('投票する'))
	})
	expect(onVote).toHaveBeenCalledWith(1)
})

it('決選投票では候補だけが並ぶ', async () => {
	const ui = await render(
		<VoteScreen
			voterIndex={2}
			voterName="き"
			names={names}
			candidates={[0, 1]}
			onVote={jest.fn()}
		/>,
	)
	await toChoose(ui)
	expect(ui.getByText('あか')).toBeTruthy()
	expect(ui.getByText('あお')).toBeTruthy()
	expect(ui.queryByText('き')).toBeNull()
})
