import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	onUpgradePress: () => void
}

// 設定画面上部のプレミアム誘導カード（参考スクショ準拠: マスコット＋王冠＋グラデボタン）
export function PremiumUpsellCard({ onUpgradePress }: Props) {
	return (
		<View style={styles.card}>
			<View style={styles.mascotWrap}>
				<MaterialCommunityIcons
					name="crown"
					testID="icon-crown"
					size={28}
					color={colors.premiumGold}
					style={styles.crown}
				/>
				<Image
					style={styles.mascot}
					source={require('@/assets/images/expo-logo.png')}
					contentFit="contain"
				/>
			</View>
			<Text style={styles.title}>WaiPa プレミアム</Text>
			<Text style={styles.copy}>広告なしで、もっと快適に遊ぼう！</Text>
			<View style={styles.buttonWrap}>
				<GradientButton title="アップグレード" onPress={onUpgradePress} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.lg,
		padding: spacing.lg,
		alignItems: 'center',
		gap: spacing.sm,
	},
	mascotWrap: { alignItems: 'center' },
	crown: { marginBottom: -spacing.xs, zIndex: 1 },
	mascot: { width: 72, height: 72 },
	title: { ...typography.title, color: colors.premiumGold },
	copy: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
	buttonWrap: { alignSelf: 'stretch', marginTop: spacing.xs },
})
