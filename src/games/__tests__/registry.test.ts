import { games, getGame } from '../registry'
import { meta as bomb216Meta } from '../bomb-216/meta'
import { meta as bombRelayMeta } from '../bomb-relay/meta'
import { meta as bombSwipeMeta } from '../bomb-swipe/meta'
import { meta as burstChickenMeta } from '../burst-chicken/meta'
import { meta as chinchiroMeta } from '../chinchiro/meta'
import { meta as dautDiceMeta } from '../daut-dice/meta'
import { meta as fiveSecStopMeta } from '../five-sec-stop/meta'
import { meta as inshuSuijakuMeta } from '../inshu-suijaku/meta'
import { meta as kanpaiWolfMeta } from '../kanpai-wolf/meta'
import { meta as kimagureOxMeta } from '../kimagure-ox/meta'
import { meta as noKingGameMeta } from '../no-king-game/meta'
import { meta as odekoPokerMeta } from '../odeko-poker/meta'
import { meta as reactionPairsMeta } from '../reaction-pairs/meta'
import { meta as sasayakiLimitMeta } from '../sasayaki-limit/meta'
import { meta as whoWillPayMeta } from '../who-will-pay/meta'

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
	it('ゲーム別 meta.ts をホーム表示順どおりに集約している', () => {
		const expected = [
			whoWillPayMeta,
			bomb216Meta,
			fiveSecStopMeta,
			kimagureOxMeta,
			noKingGameMeta,
			chinchiroMeta,
			bombRelayMeta,
			reactionPairsMeta,
			burstChickenMeta,
			dautDiceMeta,
			kanpaiWolfMeta,
			inshuSuijakuMeta,
			bombSwipeMeta,
			sasayakiLimitMeta,
			odekoPokerMeta,
		]
		expect(games).toEqual(expected)
	})

	it('MVP の8ゲーム＋プレミアム7本（バーストチキン・ダウトダイス・乾杯ウルフ・飲酒衰弱・爆弾スワイプ・ささやきリミット・おでこインディアンポーカー）が登録されている', () => {
		expect(games).toHaveLength(15)
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

	it('全ゲームの tagline がホームカードで確実に2行になる（\\n 区切り・各行1〜12文字）', () => {
		for (const g of games) {
			const lines = g.tagline.split('\n')
			expect(lines).toHaveLength(2)
			for (const line of lines) {
				expect(line.length).toBeGreaterThanOrEqual(1)
				expect(line.length).toBeLessThanOrEqual(12)
			}
		}
	})

	it('getGame が id で引ける・不明 id は undefined', () => {
		expect(getGame('who-will-pay')?.title).toBe('Who will pay')
		expect(getGame('unknown')).toBeUndefined()
	})
})
