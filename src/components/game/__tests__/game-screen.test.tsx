import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { playersStore } from '@/lib/players-store'
import type { GameMeta } from '@/games/registry'
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

beforeEach(async () => {
	await AsyncStorage.clear()
	await playersStore.hydrate()
	await playersStore.setCount(2)
	await playersStore.setName(0, 'ひろ')
	await playersStore.setName(1, 'たろう')
})

it('requiresPlayers が true のゲームは最初にゲート画面を表示し、本体は表示しない', async () => {
	const { getByText, queryByText } = await render(
		<GameScreen meta={{ ...baseMeta, requiresPlayers: true }} />,
	)
	expect(getByText('参加メンバー')).toBeTruthy()
	expect(queryByText('？')).toBeNull()
})

it('requiresPlayers が true のゲートを通過すると本体ヘッダーと Component が表示される', async () => {
	const { getByText, queryByText } = await render(
		<GameScreen meta={{ ...baseMeta, requiresPlayers: true }} />,
	)
	await act(async () => {
		fireEvent.press(getByText('つぎへ'))
	})
	await waitFor(() => {
		expect(queryByText('参加メンバー')).toBeNull()
	})
	expect(getByText('？')).toBeTruthy()
	expect(queryByText('👥')).toBeNull()
})

it('requiresPlayers が未指定のゲームは最初から本体を表示する（ゲートなし）', async () => {
	const { getByText, queryByText } = await render(<GameScreen meta={baseMeta} />)
	expect(queryByText('参加メンバー')).toBeNull()
	expect(getByText('？')).toBeTruthy()
})

it('👥ボタンはどのゲームでも表示されない', async () => {
	const { queryByText } = await render(<GameScreen meta={baseMeta} />)
	expect(queryByText('👥')).toBeNull()
})
