import { act, fireEvent, render } from '@testing-library/react-native'
import { haptics } from '@/lib/haptics'
import { BurstChickenGame } from '../burst-chicken-game'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 2, names: ['あか', 'あお'], history: [] }),
	getDisplayNames: () => ['あか', 'あお'],
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
		withRepeat: jest.fn((v: number) => v),
		withSequence: jest.fn((v: number) => v),
		withSpring: jest.fn((v: number) => v),
		getUseOfValueInStyleWarning: jest.fn(() => ''),
	}
})

// Math.random を 0.9999… に固定 → limit は常に 30（バーストさせないテスト用）
beforeEach(() => {
	jest.clearAllMocks() // haptics/sound の jest.fn() 呼び出し回数をテスト間で引き継がない
	jest.spyOn(Math, 'random').mockReturnValue(0.9999999)
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

async function press(target: Parameters<typeof fireEvent.press>[0]) {
	await act(async () => {
		fireEvent.press(target)
	})
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

type TrialStoreModule = {
	useTrialRoundConsumer: (gameId: string, isRoundEnd: boolean) => void
}

function spyTrialRoundConsumer() {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const module = require('@/lib/trial-store') as TrialStoreModule
	return jest.spyOn(module, 'useTrialRoundConsumer').mockImplementation(() => {})
}

it('初期表示: 合計0・先頭プレイヤーの手番・上限ヒント', async () => {
	const { getByText } = await render(<BurstChickenGame />)
	expect(getByText('0')).toBeTruthy()
	expect(getByText(/あかさんの番/)).toBeTruthy()
	expect(getByText(/上限は 21〜30 のどこか/)).toBeTruthy()
})

it('+3 で合計が増えて手番が交代する', async () => {
	const { getByText, getByLabelText } = await render(<BurstChickenGame />)
	await press(getByLabelText('+3'))
	expect(getByText('3')).toBeTruthy()
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('ストップは合計15未満では出ず、15で出現する', async () => {
	const { getByLabelText, queryByText, getByText } = await render(<BurstChickenGame />)
	for (let i = 0; i < 4; i++) {
		await press(getByLabelText('+3')) // 12
	}
	expect(queryByText(/ストップ宣言/)).toBeNull()
	await press(getByLabelText('+3')) // 15
	expect(getByText(/ストップ宣言/)).toBeTruthy()
})

it('バーストで爆発演出＋リザルトが出て、もう一回で新ラウンドが始まる', async () => {
	// limit=21 に固定（rng=0）
	;(Math.random as jest.Mock).mockReturnValue(0)
	const { getByLabelText, getByText, queryByText } = await render(<BurstChickenGame />)
	for (let i = 0; i < 7; i++) {
		await press(getByLabelText('+3')) // 21 ちょうどまで（セーフ）
	}
	expect(queryByText(/の負け/)).toBeNull()
	await press(getByLabelText('+1')) // 22 > 21 バースト（手番は あお）
	expect(getByText(/あおさんの負け/)).toBeTruthy()
	expect(getByText(/上限は 21 だった/)).toBeTruthy()

	await press(getByText('もう一回'))
	expect(getByText('0')).toBeTruthy()
	// 開始プレイヤーが +1 ローテーション（あお から）
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('決着画面到達でトライアルの1ラウンドを消費する', async () => {
	const consumerSpy = spyTrialRoundConsumer()
	;(Math.random as jest.Mock).mockReturnValue(0)
	const { getByLabelText, getByText } = await render(<BurstChickenGame />)
	for (let i = 0; i < 7; i++) {
		await press(getByLabelText('+3'))
	}
	await press(getByLabelText('+1'))

	expect(getByText(/あおさんの負け/)).toBeTruthy()
	expect(consumerSpy).toHaveBeenCalledWith('burst-chicken', true)
})

it('ストップ宣言でドラムロール後に精算リザルトが出る', async () => {
	;(Math.random as jest.Mock).mockReturnValue(0.9999999) // limit=30
	const { getByLabelText, getByText } = await render(<BurstChickenGame />)
	// あか +3 ×3回 / あお +2 ×2回 → 交互: 3,2,3,2,3 = 13 → あお +2 = 15
	await press(getByLabelText('+3'))
	await press(getByLabelText('+2'))
	await press(getByLabelText('+3'))
	await press(getByLabelText('+2'))
	await press(getByLabelText('+3'))
	await press(getByLabelText('+2')) // 合計15、手番=あか、貢献 [9, 6]
	await press(getByText(/ストップ宣言/)) // 宣言者=あか、最少=あお(6)
	await act(async () => {
		jest.advanceTimersByTime(2000) // ドラムロール完了
	})
	expect(getByText(/あおさんの負け/)).toBeTruthy()
	expect(getByText(/上限は 30 だった/)).toBeTruthy()
})

it('積んだ結果の合計でバイブ強度を判定する（低いうちは tap、結果が23になる add では heavy）', async () => {
	const { getByLabelText } = await render(<BurstChickenGame />)
	await press(getByLabelText('+1')) // 0→1: 低いので tap
	expect(haptics.tap).toHaveBeenCalledTimes(1)
	expect(haptics.heavy).not.toHaveBeenCalled()

	for (let i = 0; i < 6; i++) {
		await press(getByLabelText('+3')) // 1→4→7→10→13→16→19
	}
	expect(haptics.heavy).not.toHaveBeenCalled()

	await press(getByLabelText('+2')) // 19→21: tensionLevel(21)=0.4 まだ tap
	expect(haptics.heavy).not.toHaveBeenCalled()

	await press(getByLabelText('+2')) // 21→23: tensionLevel(23)≈0.53 → heavy（押す前の21ではなく結果値で判定）
	expect(haptics.heavy).toHaveBeenCalledTimes(1)
})

it('settled → もう一回 → 再度ストップまで進めてもドラムロール後にリザルトが出る（drum-deps 再スタートバグの回帰ガード）', async () => {
	;(Math.random as jest.Mock).mockReturnValue(0.9999999) // limit=30固定
	const { getByLabelText, getByText, queryByText } = await render(<BurstChickenGame />)

	// 1周目: 合計15までためてストップ→ドラムロール完了→精算リザルト
	for (let i = 0; i < 5; i++) {
		await press(getByLabelText('+3')) // 3,6,9,12,15
	}
	await press(getByText(/ストップ宣言/))
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	expect(getByText(/の負け/)).toBeTruthy()

	// もう一回 → drum.reset() 経由で新ラウンド開始
	await press(getByText('もう一回'))
	expect(getByText('0')).toBeTruthy()
	expect(queryByText(/の負け/)).toBeNull()

	// 2周目: 再度合計15までためてストップ→ドラムロールが正しく完了して敗者が再表示される
	for (let i = 0; i < 5; i++) {
		await press(getByLabelText('+3')) // 3,6,9,12,15
	}
	await press(getByText(/ストップ宣言/))
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	expect(getByText(/の負け/)).toBeTruthy()
})

describe('ガラス面', () => {
	it('手番行はガラス面で描画される', async () => {
		const { getByText } = await render(<BurstChickenGame />)

		expect(hasAncestorTestId(getByText(/あかさんの番/), 'glass-surface-pseudo')).toBe(true)
	})
})
