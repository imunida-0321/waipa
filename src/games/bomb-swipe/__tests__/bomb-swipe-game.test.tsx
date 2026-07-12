import { act, fireEvent, render } from '@testing-library/react-native'
import { BombSwipeGame } from '../bomb-swipe-game'

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
		// round-result.tsx が playerColor(...).value をスタイル内で直接参照するため、
		// reanimated babel プラグインが挿入するチェック関数もモックしておく（round-result.test.tsx と同様）
		getUseOfValueInStyleWarning: jest.fn(() => undefined),
	}
})
// ゲージは単体テスト済みのためモックし、離した位置を直接注入する
// jest.mock のファクトリはトップスコープの変数を参照できないため、react-native を内部で require する
jest.mock('../gauge', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		SwipeGauge: ({ onRelease }: { onRelease: (score: number) => void }) => (
			<>
				<Pressable testID="mock-release-50" onPress={() => onRelease(50)}>
					<Text>release50</Text>
				</Pressable>
				<Pressable testID="mock-release-60" onPress={() => onRelease(60)}>
					<Text>release60</Text>
				</Pressable>
			</>
		),
	}
})

// Math.random=0 → 全員の地雷が 60 に固定（score 60 で必ず爆発、59 以下でセーフ）
beforeEach(() => {
	jest.clearAllMocks()
	jest.spyOn(Math, 'random').mockReturnValue(0)
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

it('初期表示: 先頭プレイヤーの手番表示と開始ボタン', async () => {
	const { getByText } = await render(<BombSwipeGame />)
	expect(getByText(/あかさんの番/)).toBeTruthy()
	expect(getByText(/スワイプ開始/)).toBeTruthy()
})

it('開始→地雷未満で離すとセーフ表示、次へで手番交代', async () => {
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-50'))
	expect(getByText(/50/)).toBeTruthy()
	expect(getByText(/セーフ/)).toBeTruthy()
	await press(getByText(/次へ/))
	expect(getByText(/あおさんの番/)).toBeTruthy()
})

it('地雷ちょうどで離すと爆発表示になり explosion が鳴る', async () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { playSound } = require('@/lib/sound')
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-60'))
	expect(getByText(/爆発/)).toBeTruthy()
	expect(playSound).toHaveBeenCalledWith('explosion')
})

it('全員終了でリザルトに敗者と答え合わせが表示される', async () => {
	const { getByText, getByTestId } = await render(<BombSwipeGame />)
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-50')) // あか: 50 セーフ
	await press(getByText(/次へ/))
	await press(getByText(/スワイプ開始/))
	await press(getByTestId('mock-release-60')) // あお: 60 爆発
	await press(getByText(/次へ/))
	await act(async () => {
		jest.advanceTimersByTime(3000) // ドラムロール消化
	})
	expect(getByText(/あおさんの負け/)).toBeTruthy()
})
