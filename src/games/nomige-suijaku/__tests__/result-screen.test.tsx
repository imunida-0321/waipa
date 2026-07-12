import { act, fireEvent, render } from '@testing-library/react-native'
import { buildRanking, ResultScreen } from '../result-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
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
		withSpring: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn(), linear: jest.fn() },
		getUseOfValueInStyleWarning: jest.fn(() => undefined),
	}
})
jest.mock('@/theme/player-colors', () => ({
	PLAYER_COLORS: [
		{ name: '赤', value: '#FF3B5C' },
		{ name: '青', value: '#3B82F6' },
		{ name: '緑', value: '#22C55E' },
		{ name: '黄', value: '#FACC15' },
		{ name: '紫', value: '#A855F7' },
		{ name: 'オレンジ', value: '#FB923C' },
		{ name: 'ピンク', value: '#F472B6' },
		{ name: '水色', value: '#38BDF8' },
		{ name: '黄緑', value: '#A3E635' },
		{ name: 'ゴールド', value: '#EAB308' },
		{ name: 'シルバー', value: '#94A3B8' },
		{ name: '茶', value: '#A16207' },
	],
	playerColor: (index: number) => ({
		name: '赤',
		value: '#FF3B5C',
	}),
}))

it('buildRanking: スコア降順・同数は同順位', () => {
	const rows = buildRanking(['あ', 'い', 'う', 'え'], [1, 3, 1, 0])
	expect(rows.map((r) => r.name)).toEqual(['い', 'あ', 'う', 'え'])
	expect(rows.map((r) => r.rank)).toEqual([1, 2, 2, 4])
})

it('最下位（同数含む）がハイライトされ、ボタンが動く', async () => {
	const onRetry = jest.fn()
	const onHome = jest.fn()
	const utils = await render(
		<ResultScreen
			names={['あか', 'あお', 'みどり']}
			scores={[2, 0, 0]}
			onRetry={onRetry}
			onHome={onHome}
		/>,
	)
	// 最下位2人にバッジ
	expect(utils.getAllByText('最下位')).toHaveLength(2)
	expect(utils.getByText(/2ペア/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('もう一回'))
	})
	expect(onRetry).toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(utils.getByText('ホームへ'))
	})
	expect(onHome).toHaveBeenCalled()
})
