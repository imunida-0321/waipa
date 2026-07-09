import { act, fireEvent, render, within } from '@testing-library/react-native'
import { router } from 'expo-router'
import { CUTIN_DURATION_MS } from '../event-cutin'
import { KimagureOxGame } from '../kimagure-ox-game'

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
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
	}
})

// Math.random を 0.999 に固定: 先手は ×、イベントは発生しない
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0.999)
})
afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

it('イントロ→スタート→交互に着手→勝利でリザルトが出る', async () => {
	const { getByText, getByTestId, queryByText } = await render(<KimagureOxGame />)

	// イントロ: 先手発表（rng=0.999 → 先手 ×）
	expect(getByText(/先手は/)).toBeTruthy()
	await act(async () => fireEvent.press(getByText('スタート')))

	// × → o → × → o → × で縦列 0,3,6 が × の勝ち
	await act(async () => fireEvent.press(getByTestId('cell-0'))) // x
	await act(async () => fireEvent.press(getByTestId('cell-1'))) // o
	await act(async () => fireEvent.press(getByTestId('cell-3'))) // x
	await act(async () => fireEvent.press(getByTestId('cell-2'))) // o
	expect(queryByText(/勝ち/)).toBeNull()
	await act(async () => fireEvent.press(getByTestId('cell-6'))) // x 勝利

	expect(getByText('× の勝ち！')).toBeTruthy()
})

it('イベント発生→カットイン→効果反映の順で盤面が更新される', async () => {
	jest.useFakeTimers()
	// 乱数列: 先手決定(×) → 抽選当選 → 種別選択(block) → 封鎖マス選択(空きマス先頭)
	const values = [0.999, 0, 0.3, 0]
	let call = 0
	jest.spyOn(Math, 'random').mockImplementation(() => values[call++] ?? 0.999)

	const { getByText, getByTestId, queryByText } = await render(<KimagureOxGame />)
	await act(async () => fireEvent.press(getByText('スタート')))

	// 抽選は3手目の着手後から
	await act(async () => fireEvent.press(getByTestId('cell-0'))) // x
	await act(async () => fireEvent.press(getByTestId('cell-1'))) // o
	expect(queryByText('きまぐれ発動！')).toBeNull()
	await act(async () => fireEvent.press(getByTestId('cell-3'))) // x → イベント当選

	// カットイン表示中は効果が未反映（空きマス先頭 cell-2 が封鎖予定）
	expect(getByText('きまぐれ発動！')).toBeTruthy()
	expect(getByText('1マス封鎖')).toBeTruthy()
	expect(within(getByTestId('cell-2')).queryByText('🚧')).toBeNull()

	await act(async () => {
		jest.advanceTimersByTime(CUTIN_DURATION_MS)
	})

	// カットインが閉じて封鎖マスが盤面に反映される
	expect(queryByText('きまぐれ発動！')).toBeNull()
	expect(within(getByTestId('cell-2')).getByText('🚧')).toBeTruthy()
})

it('ホームへで router.replace("/") が呼ばれる', async () => {
	const { getByText, getByTestId } = await render(<KimagureOxGame />)
	await act(async () => fireEvent.press(getByText('スタート')))
	await act(async () => fireEvent.press(getByTestId('cell-0')))
	await act(async () => fireEvent.press(getByTestId('cell-1')))
	await act(async () => fireEvent.press(getByTestId('cell-3')))
	await act(async () => fireEvent.press(getByTestId('cell-2')))
	await act(async () => fireEvent.press(getByTestId('cell-6'))) // x 勝利
	await act(async () => fireEvent.press(getByText('ホームへ')))
	expect(router.replace).toHaveBeenCalledWith('/')
})

it('もう一回でイントロに戻る', async () => {
	const { getByText, getByTestId } = await render(<KimagureOxGame />)
	await act(async () => fireEvent.press(getByText('スタート')))
	await act(async () => fireEvent.press(getByTestId('cell-0')))
	await act(async () => fireEvent.press(getByTestId('cell-1')))
	await act(async () => fireEvent.press(getByTestId('cell-3')))
	await act(async () => fireEvent.press(getByTestId('cell-2')))
	await act(async () => fireEvent.press(getByTestId('cell-6')))
	await act(async () => fireEvent.press(getByText('もう一回')))
	expect(getByText(/先手は/)).toBeTruthy()
})
