import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { usePremium } from '@/lib/premium'
import { useTrialExhausted } from '@/lib/trial-store'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	gameId: string
}

export function TrialLockOverlay({ gameId }: Props) {
	const premiumUnlocked = usePremium()
	const exhausted = useTrialExhausted(gameId)

	if (!exhausted || premiumUnlocked) {
		return null
	}

	return (
		<View testID="trial-lock-overlay" style={styles.overlay}>
			<View style={styles.panel}>
				<MaterialCommunityIcons name="crown" size={52} color={colors.premiumGold} />
				<Text style={styles.title}>お試しはここまで！</Text>
				<Text style={styles.desc}>続きは WaiPa プレミアムで遊べます。</Text>
				<View style={styles.buttonWrap}>
					<GradientButton
						title="プレミアムにアップグレード"
						onPress={() => router.push('/paywall')}
					/>
				</View>
				<Pressable
					accessibilityRole="button"
					onPress={() => router.back()}
					style={styles.link}
				>
					<Text style={styles.linkText}>ホームへ戻る</Text>
				</Pressable>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFill,
		zIndex: 20,
		backgroundColor: 'rgba(0,0,0,0.78)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	panel: {
		width: '100%',
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.xl,
		alignItems: 'center',
		gap: spacing.md,
	},
	title: { ...typography.title, textAlign: 'center' },
	desc: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
	buttonWrap: { alignSelf: 'stretch' },
	link: { padding: spacing.sm },
	linkText: { ...typography.body, color: colors.textMuted, fontWeight: '700' },
})
