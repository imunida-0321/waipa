import { act, fireEvent, render } from '@testing-library/react-native'
import { DautDiceGame } from '../daut-dice-game'
import { ROLL_ANIM_MS } from '../dice-roll-3d'

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
jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { __esModule: true, default: View }
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
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
	}
})
jest.mock('../dice-roll-3d', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { DiceRoll3D: View, ROLL_ANIM_MS: 1200 }
})
jest.mock('@/games/chinchiro/iso-die', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { IsoDie: View }
})
jest.mock('../use-shake', () => ({
	useShake: jest.fn(),
	SHAKE_THRESHOLD_G: 1.8,
	SHAKE_COOLDOWN_MS: 1200,
}))
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 3, names: ['あか', 'あお', 'みどり'], history: [] }),
	getDisplayNames: () => ['あか', 'あお', 'みどり'],
}))

// Math.random 固定: rollDice が常に (1,1)=11 を出す
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0)
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

async function rollAndPeek(utils: Awaited<ReturnType<typeof render>>) {
	await act(async () => {
		fireEvent.press(utils.getByText('タップで振る'))
	})
	// 転がり演出が終わるまで進める
	await act(async () => {
		jest.advanceTimersByTime(ROLL_ANIM_MS)
	})
	// 長押しで確認（viewed に）
	await act(async () => {
		fireEvent(utils.getByLabelText('長押しで出目を確認'), 'pressIn')
	})
	expect(utils.getByText('11（ゾロ目）')).toBeTruthy() // 実出目
	await act(async () => {
		fireEvent(utils.getByLabelText('長押しで出目を確認'), 'pressOut')
	})
	await act(async () => {
		fireEvent.press(utils.getByText('宣言する'))
	})
}

async function loseDeclarerLifeByBluff(utils: Awaited<ReturnType<typeof render>>) {
	await rollAndPeek(utils)
	await act(async () => {
		fireEvent.press(utils.getByText('21（ミエ）'))
	})
	await act(async () => {
		fireEvent.press(utils.getByText('渡した'))
	})
	await act(async () => {
		fireEvent.press(utils.getByText('ダウト！'))
	})
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
}

type TrialStoreModule = {
	useTrialRoundConsumer: (gameId: string, isRoundEnd: boolean) => void
}

function spyTrialRoundConsumer() {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const module = require('@/lib/trial-store') as TrialStoreModule
	return jest.spyOn(module, 'useTrialRoundConsumer').mockImplementation(() => {})
}

it('peek: 長押し前は宣言不可・pressOut すると実出目が隠れる', async () => {
	const utils = await render(<DautDiceGame />)
	await act(async () => {
		fireEvent.press(utils.getByText('タップで振る'))
	})
	await act(async () => {
		jest.advanceTimersByTime(ROLL_ANIM_MS)
	})
	// 長押し前: 宣言してもフェーズが進まない（宣言リストが出てこない）
	await act(async () => {
		fireEvent.press(utils.getByText('宣言する'))
	})
	expect(utils.queryByText('21（ミエ）')).toBeNull()
	expect(utils.getByText('長押しでこっそり確認')).toBeTruthy()

	// 長押し中は実出目が見える
	await act(async () => {
		fireEvent(utils.getByLabelText('長押しで出目を確認'), 'pressIn')
	})
	expect(utils.getByText('11（ゾロ目）')).toBeTruthy()

	// 離すと実出目テキストは消える（秘匿）
	await act(async () => {
		fireEvent(utils.getByLabelText('長押しで出目を確認'), 'pressOut')
	})
	expect(utils.queryByText('11（ゾロ目）')).toBeNull()
})

it('roll → peek（長押し確認）→ declare → handover → respond まで通る', async () => {
	const utils = await render(<DautDiceGame />)
	expect(utils.getByText(/あかさんの番/)).toBeTruthy()
	await rollAndPeek(utils)
	// declare: 21（ミエ）を宣言（ブラフ）
	await act(async () => {
		fireEvent.press(utils.getByText('21（ミエ）'))
	})
	expect(utils.getByText(/あおさんへスマホを渡して/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('渡した'))
	})
	// respond: 21 はダウトのみ
	expect(utils.getByText(/あかさんの宣言/)).toBeTruthy()
	expect(utils.queryByText('信じて振る')).toBeNull()
})

it('ダウト → 公開 → ライフ-1 → 敗者先手で再開する', async () => {
	const utils = await render(<DautDiceGame />)
	await rollAndPeek(utils)
	await act(async () => {
		fireEvent.press(utils.getByText('21（ミエ）')) // 実出目11なので嘘
	})
	await act(async () => {
		fireEvent.press(utils.getByText('渡した'))
	})
	await act(async () => {
		fireEvent.press(utils.getByText('ダウト！'))
	})
	await act(async () => {
		jest.advanceTimersByTime(2000) // ドラムロール
	})
	expect(utils.getByText(/ウソだった/)).toBeTruthy()
	expect(utils.getByText(/あかさん ライフ-1/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('つぎへ'))
	})
	// 敗者（あか）先手の roll 向け handover
	expect(utils.getByText(/あかさんへスマホを渡して/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('渡した'))
	})
	expect(utils.getByText(/あかさんの番/)).toBeTruthy()
	expect(utils.getByText('タップで振る')).toBeTruthy()
})

it('決着画面到達でトライアルの1ラウンドを消費する', async () => {
	const consumerSpy = spyTrialRoundConsumer()
	const utils = await render(<DautDiceGame />)

	for (let i = 0; i < 2; i++) {
		await loseDeclarerLifeByBluff(utils)
		await act(async () => {
			fireEvent.press(utils.getByText('つぎへ'))
		})
		await act(async () => {
			fireEvent.press(utils.getByText('渡した'))
		})
	}
	await loseDeclarerLifeByBluff(utils)
	await act(async () => {
		fireEvent.press(utils.getByText('結果へ'))
	})

	expect(utils.getByText(/あかさんの負け/)).toBeTruthy()
	expect(consumerSpy).toHaveBeenCalledWith('daut-dice', true)
})

it('信じて振る → 次の人の roll になる', async () => {
	const utils = await render(<DautDiceGame />)
	await rollAndPeek(utils)
	await act(async () => {
		fireEvent.press(utils.getByText('31')) // 実出目11 ≥ 31 なので本当宣言
	})
	await act(async () => {
		fireEvent.press(utils.getByText('渡した'))
	})
	await act(async () => {
		fireEvent.press(utils.getByText('信じて振る'))
	})
	expect(utils.getByText(/あおさんの番/)).toBeTruthy()
})
