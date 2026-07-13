import { act, fireEvent, render } from '@testing-library/react-native'
import { Text } from 'react-native'
import type { Judgement } from '../engine'
import { ResultScreen } from '../result-screen'

jest.mock('@/lib/haptics', () => ({ haptics: { tap: jest.fn(), heavy: jest.fn() } }))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))
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
		getUseOfValueInStyleWarning: jest.fn(() => jest.fn()),
	}
})

beforeEach(() => {
	jest.useFakeTimers()
	jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

const names = ['あか', 'あお', 'みどり']
const cards = [5, 13, 2]

async function renderRevealed(judgement: Judgement, declarations: ('fight' | 'fold')[]) {
	const onNextRound = jest.fn()
	const utils = await render(
		<ResultScreen
			names={names}
			cards={cards}
			declarations={declarations}
			judgement={judgement}
			onNextRound={onNextRound}
			onHome={jest.fn()}
		/>,
	)
	// ドラムロール（2000ms）を進めて発表まで到達させる
	await act(async () => {
		jest.advanceTimersByTime(2100)
	})
	return { ...utils, onNextRound }
}

it('ドラムロール中はカードを公開しない', async () => {
	const j: Judgement = { outcome: 'normal', loserIndices: [0], winnerIndex: null, hetareIndex: null }
	const { queryByText } = await render(
		<ResultScreen
			names={names}
			cards={cards}
			declarations={['fight', 'fight', 'fight']}
			judgement={j}
			onNextRound={jest.fn()}
			onHome={jest.fn()}
		/>,
	)
	expect(queryByText('13')).toBeNull()
})

it('normal: 敗者の名前と全カード・全宣言が公開される', async () => {
	const j: Judgement = { outcome: 'normal', loserIndices: [0], winnerIndex: null, hetareIndex: null }
	const { getByText, getAllByText } = await renderRevealed(j, ['fight', 'fight', 'fight'])
	expect(getByText(/あかさんの負け/)).toBeTruthy()
	expect(getByText('5')).toBeTruthy()
	expect(getByText('13')).toBeTruthy()
	expect(getByText('2')).toBeTruthy()
	expect(getAllByText('勝負')).toHaveLength(3)
})

it('solo-fight: 一人勝ちの発表になり、負けなし', async () => {
	const j: Judgement = {
		outcome: 'solo-fight',
		loserIndices: [],
		winnerIndex: 1,
		hetareIndex: null,
	}
	const { getByText, queryByText } = await renderRevealed(j, ['fold', 'fight', 'fold'])
	expect(getByText(/あおさんの一人勝ち/)).toBeTruthy()
	expect(queryByText(/負け！/)).toBeNull()
})

it('all-fold: 全員負けの発表', async () => {
	const j: Judgement = { outcome: 'all-fold', loserIndices: [0, 1, 2], winnerIndex: null, hetareIndex: 1 }
	const { getByText } = await renderRevealed(j, ['fold', 'fold', 'fold'])
	expect(getByText(/全員降り/)).toBeTruthy()
})

it('ヘタレ賞のバッジと説明が表示される', async () => {
	const j: Judgement = { outcome: 'solo-fight', loserIndices: [], winnerIndex: 0, hetareIndex: 1 }
	const { getByText } = await renderRevealed(j, ['fight', 'fold', 'fold'])
	expect(getByText(/ヘタレ賞/)).toBeTruthy()
	expect(getByText(/最強カードなのに降りた あおさんも一緒に飲もう/)).toBeTruthy()
})

it('「次のラウンド」で onNextRound が呼ばれる', async () => {
	const j: Judgement = { outcome: 'all-fold', loserIndices: [0, 1, 2], winnerIndex: null, hetareIndex: null }
	const { getByText, onNextRound } = await renderRevealed(j, ['fold', 'fold', 'fold'])
	await act(async () => fireEvent.press(getByText(/次のラウンド/)))
	expect(onNextRound).toHaveBeenCalledTimes(1)
})
