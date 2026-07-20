import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { GameGrid } from '@/components/home/game-grid'
import { HeroBanner } from '@/components/home/hero-banner'
import { HomeBannerAd } from '@/components/home/home-banner-ad'
import { HomeHeader } from '@/components/home/home-header'
import { AppBackground } from '@/components/ui/app-background'
import { SectionHeader } from '@/components/ui/section-header'
import { colors, spacing, typography } from '@/theme/tokens'

export default function HomeScreen() {
	const insets = useSafeAreaInsets()

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<AppBackground />
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<HomeHeader />
				<HeroBanner />
				<SectionHeader title="ゲーム一覧" />
				<GameGrid />
				{__DEV__ && (
					<Link href="/gallery" style={styles.devLink}>
						デザインギャラリー
					</Link>
				)}
			</ScrollView>
			<HomeBannerAd />
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
	devLink: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg },
})
