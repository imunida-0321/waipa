import { act, fireEvent, render } from '@testing-library/react-native'
import { ResultScreen } from '../result-screen'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
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

const base = {
	names: ['あか', 'あお', 'みどり'],
	scores: [2, 0, 2],
	punishCounts: [1, 3, 0],
	onRetry: jest.fn(),
	onHome: jest.fn(),
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

it('スコア降順・同数同順位のランキングを表示する', async () => {
	const { getAllByText, getByText } = await render(<ResultScreen {...base} loserIndex={null} />)
	expect(getAllByText('1位')).toHaveLength(2) // あか・みどり が同率1位
	expect(getByText('3位')).toBeTruthy() // あお
	expect(getByText('罰 3回')).toBeTruthy()
})

it('ジョーカー終了時は即負け見出しを出す', async () => {
	const { getByText } = await render(<ResultScreen {...base} loserIndex={1} />)
	expect(getByText('あおさん、ジョーカーで即負け！')).toBeTruthy()
})

it('もう一回 / ホームへ が動く', async () => {
	const { getByText } = await render(<ResultScreen {...base} loserIndex={null} />)
	await act(async () => {
		fireEvent.press(getByText('もう一回'))
	})
	expect(base.onRetry).toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(getByText('ホームへ'))
	})
	expect(base.onHome).toHaveBeenCalled()
})

describe('ガラス面', () => {
	it('ランキング行はガラス面で描画される', async () => {
		const { getByText } = await render(<ResultScreen {...base} loserIndex={null} />)

		expect(hasAncestorTestId(getByText('あか'), 'glass-surface-pseudo')).toBe(true)
	})
})
