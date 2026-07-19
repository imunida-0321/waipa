import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { initAds } from '@/lib/ads'
import { playersStore } from '@/lib/players-store'
import { settingsStore } from '@/lib/settings-store'
import { registerSound } from '@/lib/sound'
import { topicsStore } from '@/lib/topics-store'
import { wordPairsStore } from '@/lib/word-pairs-store'
import { colors } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
	const colorScheme = useColorScheme()

	useEffect(() => {
		initAds()
		settingsStore.hydrate()
		playersStore.hydrate()
		topicsStore.hydrate().then(() => {
			topicsStore.refresh()
		})
		wordPairsStore.hydrate().then(() => {
			wordPairsStore.refresh()
		})
		// 効果音の登録（出典・ライセンスは assets/sounds/README.md 参照）。
		// SSR 環境に Audio API がないため、モジュール直下ではなく
		// クライアントマウント後（useEffect）で登録する
		registerSound('tap', require('@/assets/sounds/tap.m4a'))
		registerSound('explosion', require('@/assets/sounds/explosion.m4a'))
		registerSound('drumroll', require('@/assets/sounds/drumroll.m4a'))
		registerSound('reveal', require('@/assets/sounds/reveal.m4a'))
		registerSound('spin', require('@/assets/sounds/spin.m4a'))
		registerSound('event', require('@/assets/sounds/event.m4a'))
		registerSound('diceRoll1', require('@/assets/sounds/chinchiro1.mp3'))
		registerSound('diceRoll2', require('@/assets/sounds/chinchiro2.mp3'))
		registerSound('heartbeat', require('@/assets/sounds/heartbeat.m4a'))
	}, [])

	return (
		<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
			<AnimatedSplashOverlay />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" />
				<Stack.Screen
					name="gallery"
					options={{
						headerShown: true,
						title: 'デザインギャラリー',
						headerStyle: { backgroundColor: colors.background },
						headerTintColor: colors.text,
					}}
				/>
				<Stack.Screen name="game/[id]" />
				<Stack.Screen
					name="settings"
					options={{
						headerShown: true,
						title: '設定とアクティビティ',
						headerStyle: { backgroundColor: colors.background },
						headerTintColor: colors.text,
					}}
				/>
			</Stack>
		</ThemeProvider>
	)
}
