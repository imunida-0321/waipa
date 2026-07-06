import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import AppTabs from '@/components/app-tabs'
import { settingsStore } from '@/lib/settings-store'

SplashScreen.preventAutoHideAsync()

export default function TabLayout() {
	const colorScheme = useColorScheme()

	useEffect(() => {
		settingsStore.hydrate()
	}, [])

	return (
		<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
			<AnimatedSplashOverlay />
			<AppTabs />
		</ThemeProvider>
	)
}
