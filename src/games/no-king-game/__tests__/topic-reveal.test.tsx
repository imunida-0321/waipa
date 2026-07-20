import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { TopicReveal } from '../topic-reveal'

type MockDrumrollPhase = 'idle' | 'rolling' | 'revealed'

let mockDrumroll: {
	phase: MockDrumrollPhase
	start: jest.Mock
	reset: jest.Mock
} = {
	phase: 'idle',
	start: jest.fn(),
	reset: jest.fn(),
}

jest.mock('@/components/game/use-drumroll', () => ({
	useDrumroll: () => mockDrumroll,
}))
jest.mock('@/components/game/drumroll-reveal', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text, View } = require('react-native')
	return {
		DrumrollReveal: ({
			phase,
			children,
		}: {
			phase: MockDrumrollPhase
			children?: import('react').ReactNode
		}) => (
			<View>
				<Text>drumroll:{phase}</Text>
				{children}
			</View>
		),
	}
})
jest.mock('@/components/ui/gradient-button', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		GradientButton: ({ title, onPress }: { title: string; onPress: () => void }) => (
			<Pressable accessibilityRole="button" onPress={onPress}>
				<Text>{title}</Text>
			</Pressable>
		),
	}
})
jest.mock('@/components/ui/pill-button', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		PillButton: ({ title, onPress }: { title: string; onPress: () => void }) => (
			<Pressable accessibilityRole="button" onPress={onPress}>
				<Text>{title}</Text>
			</Pressable>
		),
	}
})

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

describe('TopicReveal', () => {
	beforeEach(() => {
		mockDrumroll = {
			phase: 'idle',
			start: jest.fn(),
			reset: jest.fn(),
		}
		jest.clearAllMocks()
	})

	it('お題とスキップ残数と運命のボタンを表示する', async () => {
		const onSkip = jest.fn()
		const { getByText } = await render(
			<TopicReveal
				phase="reveal"
				round={1}
				topicText="全力で拍手する"
				executorNumber={2}
				skipsLeft={2}
				onSkip={onSkip}
				onRevealDone={jest.fn()}
				onNextRound={jest.fn()}
			/>,
		)

		expect(getByText('ROUND 1')).toBeTruthy()
		expect(getByText('お題')).toBeTruthy()
		expect(getByText('全力で拍手する')).toBeTruthy()

		await act(async () => {
			fireEvent.press(getByText('お題をスキップ（残り2回）'))
		})
		await act(async () => {
			fireEvent.press(getByText('運命のボタン'))
		})

		expect(onSkip).toHaveBeenCalledTimes(1)
		expect(mockDrumroll.start).toHaveBeenCalledTimes(1)
	})

	it('スキップ残数がないと使い切り表示になる', async () => {
		const { getByText, queryByText } = await render(
			<TopicReveal
				phase="reveal"
				round={1}
				topicText="好きな飲み物を言う"
				executorNumber={1}
				skipsLeft={0}
				onSkip={jest.fn()}
				onRevealDone={jest.fn()}
				onNextRound={jest.fn()}
			/>,
		)

		expect(getByText('スキップは使い切りました')).toBeTruthy()
		expect(queryByText(/お題をスキップ/)).toBeNull()
	})

	it('ドラムロールが revealed になると発表完了を通知する', async () => {
		mockDrumroll.phase = 'revealed'
		const onRevealDone = jest.fn()
		const { getByText } = await render(
			<TopicReveal
				phase="reveal"
				round={1}
				topicText="一発ギャグをする"
				executorNumber={4}
				skipsLeft={1}
				onSkip={jest.fn()}
				onRevealDone={onRevealDone}
				onNextRound={jest.fn()}
			/>,
		)

		expect(getByText('drumroll:revealed')).toBeTruthy()
		expect(getByText('4番！')).toBeTruthy()
		await waitFor(() => {
			expect(onRevealDone).toHaveBeenCalledTimes(1)
		})
	})

	it('done では実行案内と次ラウンドボタンを表示する', async () => {
		mockDrumroll.phase = 'revealed'
		const onNextRound = jest.fn()
		const { getByText } = await render(
			<TopicReveal
				phase="done"
				round={3}
				topicText="10秒間ロボットダンスをする"
				executorNumber={5}
				skipsLeft={1}
				onSkip={jest.fn()}
				onRevealDone={jest.fn()}
				onNextRound={onNextRound}
			/>,
		)

		expect(getByText('5番の人は名乗り出て、お題を実行！')).toBeTruthy()

		await act(async () => {
			fireEvent.press(getByText('次のラウンド（番号を配り直す）'))
		})
		expect(onNextRound).toHaveBeenCalledTimes(1)
	})

	it('お題カードはガラス面で描画される', async () => {
		const { getByText } = await render(
			<TopicReveal
				phase="reveal"
				round={1}
				topicText="全力で拍手する"
				executorNumber={2}
				skipsLeft={2}
				onSkip={jest.fn()}
				onRevealDone={jest.fn()}
				onNextRound={jest.fn()}
			/>,
		)

		expect(hasAncestorTestId(getByText('全力で拍手する'), 'glass-surface-pseudo')).toBe(true)
	})
})
