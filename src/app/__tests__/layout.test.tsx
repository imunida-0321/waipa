import { act, render, waitFor } from '@testing-library/react-native'
import * as SplashScreen from 'expo-splash-screen'
import { playersStore } from '@/lib/players-store'
import { settingsStore } from '@/lib/settings-store'
import { registerSound } from '@/lib/sound'
import { topicsStore } from '@/lib/topics-store'
import { wordPairsStore } from '@/lib/word-pairs-store'
import { initAds } from '@/lib/ads'
import RootLayout from '../_layout'

jest.mock('expo-splash-screen', () => ({
	preventAutoHideAsync: jest.fn(async () => {}),
}))
jest.mock('expo-router', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React = require('react')
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	const Stack = ({ children }: { children?: import('react').ReactNode }) =>
		React.createElement(React.Fragment, null, children)
	Stack.Screen = ({ name }: { name: string }) => React.createElement(Text, null, `screen:${name}`)
	return {
		DarkTheme: { name: 'dark' },
		DefaultTheme: { name: 'light' },
		Stack,
		ThemeProvider: ({ children }: { children?: import('react').ReactNode }) =>
			React.createElement(React.Fragment, null, children),
	}
})
jest.mock('@/components/animated-icon', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return { AnimatedSplashOverlay: () => <Text>animated-splash</Text> }
})
jest.mock('@/lib/settings-store', () => ({
	settingsStore: { hydrate: jest.fn() },
}))
jest.mock('@/lib/players-store', () => ({
	playersStore: { hydrate: jest.fn() },
}))
jest.mock('@/lib/topics-store', () => ({
	topicsStore: { hydrate: jest.fn(async () => {}), refresh: jest.fn() },
}))
jest.mock('@/lib/word-pairs-store', () => ({
	wordPairsStore: { hydrate: jest.fn(async () => {}), refresh: jest.fn() },
}))
jest.mock('@/lib/sound', () => ({
	registerSound: jest.fn(),
}))
jest.mock('@/lib/ads', () => ({ initAds: jest.fn() }))

const initAdsMock = initAds as jest.MockedFunction<typeof initAds>
const registerSoundMock = registerSound as jest.MockedFunction<typeof registerSound>
const settingsHydrateMock = settingsStore.hydrate as jest.MockedFunction<
	typeof settingsStore.hydrate
>
const playersHydrateMock = playersStore.hydrate as jest.MockedFunction<typeof playersStore.hydrate>
const topicsHydrateMock = topicsStore.hydrate as jest.MockedFunction<typeof topicsStore.hydrate>
const topicsRefreshMock = topicsStore.refresh as jest.MockedFunction<typeof topicsStore.refresh>
const wordPairsHydrateMock = wordPairsStore.hydrate as jest.MockedFunction<
	typeof wordPairsStore.hydrate
>
const wordPairsRefreshMock = wordPairsStore.refresh as jest.MockedFunction<
	typeof wordPairsStore.refresh
>

describe('RootLayout', () => {
	it('スプラッシュ保持を開始して Stack 画面を登録する', async () => {
		const { getByText } = await render(<RootLayout />)

		expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalledTimes(1)
		expect(getByText('animated-splash')).toBeTruthy()
		expect(getByText('screen:index')).toBeTruthy()
		expect(getByText('screen:gallery')).toBeTruthy()
		expect(getByText('screen:game/[id]')).toBeTruthy()
		expect(getByText('screen:settings')).toBeTruthy()
	})

	it('マウント時にストア hydrate と効果音登録を実行する', async () => {
		initAdsMock.mockClear()
		settingsHydrateMock.mockClear()
		playersHydrateMock.mockClear()
		topicsHydrateMock.mockClear()
		topicsRefreshMock.mockClear()
		wordPairsHydrateMock.mockClear()
		wordPairsRefreshMock.mockClear()
		registerSoundMock.mockClear()

		await act(async () => {
			await render(<RootLayout />)
		})

		await waitFor(() => {
			expect(topicsRefreshMock).toHaveBeenCalledTimes(1)
			expect(wordPairsRefreshMock).toHaveBeenCalledTimes(1)
		})
		expect(settingsHydrateMock).toHaveBeenCalledTimes(1)
		expect(playersHydrateMock).toHaveBeenCalledTimes(1)
		expect(topicsHydrateMock).toHaveBeenCalledTimes(1)
		expect(wordPairsHydrateMock).toHaveBeenCalledTimes(1)
		expect(registerSoundMock.mock.calls.map(([name]) => name)).toEqual([
			'tap',
			'explosion',
			'drumroll',
			'reveal',
			'spin',
			'event',
			'diceRoll1',
			'diceRoll2',
			'heartbeat',
		])
	})

	it('起動時に広告を初期化する', async () => {
		initAdsMock.mockClear()
		await render(<RootLayout />)
		expect(initAdsMock).toHaveBeenCalledTimes(1)
	})
})
