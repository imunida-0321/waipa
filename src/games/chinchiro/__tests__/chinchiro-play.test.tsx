import { act, fireEvent, render } from '@testing-library/react-native'
import { ChinchiroPlay, ROLL_DURATION_MS } from '../chinchiro-play'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
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
// expo-gl / @react-three/fiber は jest 環境でロードできないため 3D 表示はモック
jest.mock('../dice-3d', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { Dice3D: () => <View testID="dice-3d" /> }
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
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn(), linear: jest.fn() },
	}
})

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

// rng を並べて出目を固定する。1投 = [ションベン判定, 目1, 目2, 目3]
function seqRng(values: number[]): () => number {
	let i = 0
	return () => values[i++] ?? 0.999
}

// 出目 n を出す rng 値（floor(v*6)+1 = n となる代表値）
const die = (n: number) => (n - 0.5) / 6

async function setup(
	rngValues: number[],
	playerNames = ['アオイ', 'ユウタ'],
	onFinish = jest.fn(),
) {
	const utils = await render(
		<ChinchiroPlay playerNames={playerNames} onFinish={onFinish} rng={seqRng(rngValues)} />,
	)
	return { onFinish, ...utils }
}

// 丸ボタンを押すヘルパー
function pressRoll(getByTestId: (id: string) => unknown) {
	fireEvent.press(getByTestId('roll-button') as never)
}

it('丸ボタンで振って役確定→settled→もう一度押すと次プレイヤーの投擲が即始まる', async () => {
	const { getByText, getByTestId, queryByText } = await setup([
		0.9,
		die(4),
		die(5),
		die(6), // 1人目1投目: セーフ、4-5-6=シゴロ
		0.9,
		die(1),
		die(2),
		die(3), // 2人目1投目: ヒフミ（設定不要だが rng を用意）
	])

	expect(getByText('1人目 / 2人')).toBeTruthy()
	expect(getByText('アオイ さんの番')).toBeTruthy()

	await act(async () => pressRoll(getByTestId))
	// 転がり中は役はまだ出ない
	expect(queryByText('シゴロ！')).toBeNull()
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	// settled: シゴロ確定
	expect(getByText('シゴロ！')).toBeTruthy()

	// もう一度押すと次プレイヤーの投擲が即開始（2人目・rolling）
	await act(async () => pressRoll(getByTestId))
	expect(getByText(/2人目/)).toBeTruthy()
	expect(getByText('ユウタ さんの番')).toBeTruthy()
	expect(getByText('コロコロコロ…')).toBeTruthy()
})

it('役なし3投で目なし確定になる', async () => {
	const { getByText, getByTestId } = await setup([
		0.9,
		die(2),
		die(4),
		die(6), // 1投目: 役なし
		0.9,
		die(1),
		die(3),
		die(5), // 2投目: 役なし
		0.9,
		die(2),
		die(4),
		die(6), // 3投目: 役なし → 目なし確定
	])

	await act(async () => pressRoll(getByTestId))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('役なし…')).toBeTruthy()

	await act(async () => pressRoll(getByTestId))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('役なし…')).toBeTruthy()

	await act(async () => pressRoll(getByTestId))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('目なし…')).toBeTruthy()
})

it('ションベン表示と投数消費', async () => {
	const { getByText, getByTestId } = await setup([
		0.01,
		die(1),
		die(1),
		die(1), // 1投目: ションベン（ピンゾロ無効）
		0.9,
		die(3),
		die(3),
		die(5), // 2投目: 5の目
	])

	await act(async () => pressRoll(getByTestId))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	expect(getByText('ションベン！')).toBeTruthy()
	expect(getByText(/のこり2投/)).toBeTruthy()

	await act(async () => pressRoll(getByTestId))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('5の目')).toBeTruthy()
})

it('ピンゾロで紙吹雪が出る', async () => {
	const { getByText, getByTestId } = await setup([0.9, die(1), die(1), die(1)], ['アオイ'])

	await act(async () => pressRoll(getByTestId))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))

	expect(getByText('ピンゾロ！')).toBeTruthy()
	expect(getByTestId('confetti-burst')).toBeTruthy()
})

it('最終プレイヤー settled 後のボタン押下で onFinish が全員分の Hand で呼ばれる', async () => {
	const { getByText, getByTestId, onFinish } = await setup(
		[
			0.9,
			die(4),
			die(5),
			die(6), // 1人目: シゴロ
			0.9,
			die(1),
			die(2),
			die(3), // 2人目: ヒフミ
		],
		['アオイ', 'ユウタ'],
	)

	// 1人目: シゴロ確定 → 次へ
	await act(async () => pressRoll(getByTestId))
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('シゴロ！')).toBeTruthy()
	await act(async () => pressRoll(getByTestId))

	// 2人目（最終）: ヒフミ確定
	await act(async () => jest.advanceTimersByTime(ROLL_DURATION_MS))
	expect(getByText('ヒフミ…')).toBeTruthy()
	expect(onFinish).not.toHaveBeenCalled()

	// 最終プレイヤーの settled 後にボタン → onFinish
	await act(async () => pressRoll(getByTestId))
	expect(onFinish).toHaveBeenCalledTimes(1)
	expect(onFinish).toHaveBeenCalledWith([
		expect.objectContaining({ type: 'shigoro', score: 800 }),
		expect.objectContaining({ type: 'hifumi' }),
	])
})
