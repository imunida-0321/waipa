import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { playersStore } from '@/lib/players-store'
import type { GameMeta } from '@/games/registry'
import { maybeShowGameExitInterstitial } from '@/lib/ads'
import { GameScreen } from '../game-screen'

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
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}))
jest.mock('@/lib/ads', () => ({ maybeShowGameExitInterstitial: jest.fn() }))
jest.mock('@/theme/player-colors', () => ({
	playerColor: (index: number) => ({ name: `色${index}`, value: '#FF0000' }),
}))
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: jest.fn(() => ({
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
	})),
}))
// how-to-play-modal.tsx が GradientButton (expo-linear-gradient 使用) を
// import するため、既存の how-to-play-modal.test.tsx 等と同様にモックして
// 未トランスパイルの ESM 依存によるパースエラーを回避する
jest.mock('@/components/ui/gradient-button', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		GradientButton: ({ title, onPress }: { title: string; onPress: () => void }) => (
			<Pressable onPress={onPress}>
				<Text>{title}</Text>
			</Pressable>
		),
	}
})
// babel-preset-expo が react-native-reanimated のプラグインを自動適用するため、
// 配列 style を含むホストコンポーネントのレンダーで実体（未モック）の
// react-native-reanimated / react-native-worklets が遅延 require されてしまい
// ネイティブモジュール不在でクラッシュする。player-setup-sheet.test.tsx と
// 同様にモックして回避する（GameScreen のゲート分岐で PlayerSetupSheet を描画するため）
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
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

function DummyGame() {
	return null
}

const baseMeta: GameMeta = {
	id: 'dummy',
	title: 'ダミー',
	tagline: 'テスト用',
	emoji: '🎲',
	gradient: ['#000000', '#111111'],
	minPlayers: 2,
	maxPlayers: 8,
	howToPlay: ['あそびかた1'],
	Component: DummyGame,
}

const maybeShowGameExitInterstitialMock = jest.mocked(maybeShowGameExitInterstitial)

beforeEach(async () => {
	maybeShowGameExitInterstitialMock.mockClear()
	await AsyncStorage.clear()
	await playersStore.hydrate()
	await playersStore.setCount(2)
	await playersStore.setName(0, 'ひろ')
	await playersStore.setName(1, 'たろう')
})

it('最初は毎回イントロ画面を表示し、本体もゲートも表示しない', async () => {
	const { getByText, queryByText } = await render(
		<GameScreen meta={{ ...baseMeta, requiresPlayers: true }} />,
	)
	expect(getByText('ゲームスタート')).toBeTruthy()
	expect(getByText('テスト用')).toBeTruthy() // catchCopy 未指定時は tagline
	expect(getByText('詳しい遊び方を見る')).toBeTruthy()
	expect(queryByText('参加メンバー')).toBeNull()
	expect(queryByText('‹')).toBeNull() // 本体ヘッダーは未表示
})

it('catchCopy と summary が指定されていればイントロに表示する', async () => {
	const { getByText } = await render(
		<GameScreen meta={{ ...baseMeta, catchCopy: 'キャッチ！', summary: 'ダイジェスト説明' }} />,
	)
	expect(getByText('キャッチ！')).toBeTruthy()
	expect(getByText('ダイジェスト説明')).toBeTruthy()
})

it('requiresPlayers: ゲームスタートでゲート→つぎへで本体ヘッダー表示', async () => {
	const { getByText, queryByText } = await render(
		<GameScreen meta={{ ...baseMeta, requiresPlayers: true }} />,
	)
	await act(async () => {
		fireEvent.press(getByText('ゲームスタート'))
	})
	expect(getByText('参加メンバー')).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('つぎへ'))
	})
	await waitFor(() => {
		expect(queryByText('参加メンバー')).toBeNull()
	})
	expect(getByText('？')).toBeTruthy()
	expect(queryByText('👥')).toBeNull()
})

it('requiresPlayers 未指定: ゲームスタートで直接本体を表示する', async () => {
	const { getByText, queryByText } = await render(<GameScreen meta={baseMeta} />)
	await act(async () => {
		fireEvent.press(getByText('ゲームスタート'))
	})
	expect(queryByText('参加メンバー')).toBeNull()
	expect(getByText('？')).toBeTruthy()
	expect(queryByText('👥')).toBeNull()
})

it('「詳しい遊び方を見る」でモーダルが開き、最終ページの「閉じる」で閉じる', async () => {
	const { getByText, queryByText } = await render(
		<GameScreen meta={{ ...baseMeta, summary: '概要テキスト' }} />,
	)
	await act(async () => {
		fireEvent.press(getByText('詳しい遊び方を見る'))
	})
	expect(getByText('あそびかた1')).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('閉じる')) // 1ページなので最終ページ
	})
	await waitFor(() => {
		expect(queryByText('あそびかた1')).toBeNull()
	})
	expect(getByText('ゲームスタート')).toBeTruthy() // イントロに留まる
})

it('requiresPlayers: 保存済み人数が maxPlayers 超ならゲートで切り詰められる', async () => {
	await playersStore.setCount(10)
	const { getByText, getAllByPlaceholderText } = await render(
		<GameScreen meta={{ ...baseMeta, requiresPlayers: true }} />,
	)
	await act(async () => {
		fireEvent.press(getByText('ゲームスタート'))
	})
	await waitFor(() => {
		expect(getAllByPlaceholderText('プレイヤー名を入力...')).toHaveLength(8)
	})
	expect(playersStore.getState().count).toBe(8)
	expect(getByText('このゲームは2〜8人用のため人数を調整しました')).toBeTruthy()
})

it('requiresPlayers: 保存済み人数が minPlayers 未満ならゲートで引き上げられる', async () => {
	// beforeEach で count=2。minPlayers=3 のゲームに入る
	const { getByText, getAllByPlaceholderText } = await render(
		<GameScreen meta={{ ...baseMeta, minPlayers: 3, requiresPlayers: true }} />,
	)
	await act(async () => {
		fireEvent.press(getByText('ゲームスタート'))
	})
	await waitFor(() => {
		expect(getAllByPlaceholderText('プレイヤー名を入力...')).toHaveLength(3)
	})
	expect(playersStore.getState().count).toBe(3)
	expect(getByText('このゲームは3〜8人用のため人数を調整しました')).toBeTruthy()
})

it('イントロの×で router.back が呼ばれる', async () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { router } = require('expo-router')
	const { getByLabelText } = await render(<GameScreen meta={baseMeta} />)
	await act(async () => {
		fireEvent.press(getByLabelText('とじる'))
	})
	expect(router.back).toHaveBeenCalled()
})

it('イントロで閉じたときはインタースティシャルを呼ばない', async () => {
	const { getByLabelText } = await render(<GameScreen meta={baseMeta} />)
	await act(async () => {
		fireEvent.press(getByLabelText('とじる'))
	})
	expect(maybeShowGameExitInterstitialMock).not.toHaveBeenCalled()
})

it('play ステージからの戻るでインタースティシャルを1回呼ぶ', async () => {
	const { getByText } = await render(<GameScreen meta={baseMeta} />)
	await act(async () => {
		fireEvent.press(getByText('ゲームスタート'))
	})
	await act(async () => {
		fireEvent.press(getByText('‹'))
	})
	expect(maybeShowGameExitInterstitialMock).toHaveBeenCalledTimes(1)
})
