import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme/tokens'

// ブランドバナー（1枚固定）。複数枚化する際は横 ScrollView ページングに置き換える
export function HeroBanner() {
	return (
		<View>
			<LinearGradient
				colors={[colors.accentFrom, colors.accentTo]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.banner}
			>
				<Text style={styles.kicker}>PARTY MINI GAMES</Text>
				<Text style={styles.title}>WAIPA GAME</Text>
				<Text style={styles.subtitle}>スマホ1台で、みんなでワイワイ</Text>
			</LinearGradient>
			<View style={styles.dots}>
				<View style={styles.dotActive} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	banner: {
		borderRadius: radii.lg,
		padding: spacing.lg,
		minHeight: 150,
		justifyContent: 'flex-end',
		gap: spacing.xs,
	},
	kicker: { ...typography.caption, color: colors.text, letterSpacing: 2 },
	title: { ...typography.hero, fontSize: 36, fontStyle: 'italic' },
	subtitle: { ...typography.body, fontWeight: '600' },
	dots: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
	dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text },
})
