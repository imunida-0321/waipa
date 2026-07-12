import { games, getGame } from '../registry'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-audio', () => ({
	createAudioPlayer: jest.fn(),
}))
jest.mock('@/lib/sound', () => ({
	playSound: jest.fn(),
	registerSound: jest.fn(),
}))
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('react-native-svg', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: View,
		Svg: View,
		G: View,
		Path: View,
		Circle: View,
		Polygon: View,
	}
})
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: { View },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withRepeat: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		Easing: { out: jest.fn(() => jest.fn()), cubic: jest.fn() },
		runOnJS: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
	}
})
// expo-gl / @react-three/fiber は jest 環境でロードできないため 3D 表示はモック
jest.mock('@/games/chinchiro/dice-3d', () => ({ Dice3D: jest.fn() }))
jest.mock('@/games/daut-dice/dice-roll-3d', () => ({
	DiceRoll3D: jest.fn(),
	ROLL_ANIM_MS: 1200,
}))

describe('ゲームレジストリ', () => {
	it('MVP の8ゲーム＋プレミアム4本（バーストチキン・ダウトダイス・ワードウルフ・飲酒衰弱）が登録されている', () => {
		expect(games).toHaveLength(12)
	})

	it('id が一意', () => {
		const ids = games.map((g) => g.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('全ゲームにメタ情報が揃っている', () => {
		for (const g of games) {
			expect(g.title.length).toBeGreaterThan(0)
			expect(g.tagline.length).toBeGreaterThan(0)
			expect(g.emoji.length).toBeGreaterThan(0)
			expect(g.gradient).toHaveLength(2)
			expect(g.minPlayers).toBeGreaterThanOrEqual(2)
			expect(g.maxPlayers).toBeLessThanOrEqual(12)
			expect(g.minPlayers).toBeLessThanOrEqual(g.maxPlayers)
			expect(g.howToPlay.length).toBeGreaterThan(0)
			expect(g.Component).toBeDefined()
		}
	})

	it('getGame が id で引ける・不明 id は undefined', () => {
		expect(getGame('who-will-pay')?.title).toBe('Who will pay')
		expect(getGame('unknown')).toBeUndefined()
	})
})
