import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { playersStore } from '@/lib/players-store'
import { settingsStore } from '@/lib/settings-store'
import { registerSound } from '@/lib/sound'
import { topicsStore } from '@/lib/topics-store'
import { colors } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
	const colorScheme = useColorScheme()

	useEffect(() => {
		settingsStore.hydrate()
		playersStore.hydrate()
		topicsStore.hydrate().then(() => {
			topicsStore.refresh()
		})
		// 効果音（暫定生成音。フリー素材に同名上書きで差し替え可）
		// SSR 環境に Audio API がないため、クライアントマウント後に登録する
		registerSound('tap', require('@/assets/sounds/tap.wav'))
		registerSound('explosion', require('@/assets/sounds/explosion.wav'))
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
