import { act, fireEvent, render, within } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { games } from '@/games/registry'
import { GameGrid } from '../game-grid'

// プレミアム判定は @/lib/premium に集約されているのでここだけモックする
let mockPremiumUnlocked = false
jest.mock('@/lib/premium', () => ({
	isPremiumUnlocked: () => mockPremiumUnlocked,
	usePremium: () => mockPremiumUnlocked,
}))

// プレミアム限定ゲームの実例として実レジストリの burst-chicken（premium: true）をそのまま使う
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
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))
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
jest.mock('@/games/chinchiro/dice-3d', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { Dice3D: () => <View testID="dice-3d" /> }
})
jest.mock('@/games/daut-dice/dice-roll-3d', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { DiceRoll3D: () => <View testID="dice-roll-3d" />, ROLL_ANIM_MS: 1200 }
})

it('レジストリの全ゲームがカード表示される', async () => {
	const { getByText, getByLabelText } = await render(<GameGrid />)
	for (const g of games) {
		// thumbnail 画像カードはタイトルが画像内にあるため、読み上げラベルで確認する
		if (g.cardThumbnail !== undefined) {
			expect(getByLabelText(g.title)).toBeTruthy()
		} else {
			expect(getByText(g.title)).toBeTruthy()
		}
	}
})

it('カードタップで該当ゲームへ遷移する', async () => {
	const { getByLabelText } = await render(<GameGrid />)
	fireEvent.press(getByLabelText('BOMB!! 2/16'))
	expect(router.push).toHaveBeenCalledWith({
		pathname: '/game/[id]',
		params: { id: 'bomb-2-16' },
	})
})

describe('千鳥グリッド構造', () => {
	it('偶数番目が左列・奇数番目が右列に分かれる', async () => {
		const { getByTestId } = await render(<GameGrid />)
		const left = within(getByTestId('grid-left-column'))
		const right = within(getByTestId('grid-right-column'))
		expect(left.getByLabelText(games[0].title)).toBeTruthy()
		expect(right.getByLabelText(games[1].title)).toBeTruthy()
		expect(left.getByLabelText(games[2].title)).toBeTruthy()
		expect(right.queryByLabelText(games[0].title)).toBeNull()
	})

	it('全ゲームが左右いずれかの列に表示される', async () => {
		const { getByTestId } = await render(<GameGrid />)
		const left = within(getByTestId('grid-left-column'))
		const right = within(getByTestId('grid-right-column'))
		for (const [i, g] of games.entries()) {
			const column = i % 2 === 0 ? left : right
			expect(column.getByLabelText(g.title)).toBeTruthy()
		}
	})

	it('右列には半タイル分の上オフセットがある', async () => {
		const { getByTestId } = await render(<GameGrid />)
		const style = StyleSheet.flatten(getByTestId('grid-right-column').props.style)
		expect(style.paddingTop).toBe('18.5%')
		const leftStyle = StyleSheet.flatten(getByTestId('grid-left-column').props.style)
		expect(leftStyle.paddingTop).toBeUndefined()
	})
})

describe('プレミアムゲート', () => {
	beforeEach(() => {
		mockPremiumUnlocked = false
		jest.clearAllMocks()
	})

	it('ロック中のプレミアムゲームをタップするとモーダルが出て遷移しない', async () => {
		const { getByLabelText, getByText } = await render(<GameGrid />)
		await act(async () => {
			fireEvent.press(getByLabelText('バーストチキン'))
		})
		expect(getByText(/WaiPa プレミアムで遊べます/)).toBeTruthy()
		expect(router.push).not.toHaveBeenCalled()
	})

	it('解放済みなら通常どおり遷移する', async () => {
		mockPremiumUnlocked = true
		const { getByLabelText, queryByText } = await render(<GameGrid />)
		fireEvent.press(getByLabelText('バーストチキン'))
		expect(queryByText(/WaiPa プレミアムで遊べます/)).toBeNull()
		expect(router.push).toHaveBeenCalledWith({
			pathname: '/game/[id]',
			params: { id: 'burst-chicken' },
		})
	})

	it('無料ゲームはロック判定に関係なく遷移する', async () => {
		const { getByLabelText } = await render(<GameGrid />)
		fireEvent.press(getByLabelText('BOMB!! 2/16'))
		expect(router.push).toHaveBeenCalledWith({
			pathname: '/game/[id]',
			params: { id: 'bomb-2-16' },
		})
	})
})
