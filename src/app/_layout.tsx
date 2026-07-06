import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { playersStore } from '@/lib/players-store'
import { settingsStore } from '@/lib/settings-store'
import { colors } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
	const colorScheme = useColorScheme()

	useEffect(() => {
		settingsStore.hydrate()
		playersStore.hydrate()
	}, [])

	return (
		<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
			<AnimatedSplashOverlay />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(tabs)" />
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
			</Stack>
		</ThemeProvider>
	)
}
