import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	gameTitle: string
	onClose: () => void
}

// プレミアム限定ゲームの案内。閉じてから遷移し、背後にモーダルを残さない
export function PremiumLockModal({ visible, gameTitle, onClose }: Props) {
	function handleUpgrade() {
		onClose()
		router.push('/paywall')
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={() => {}}>
					<MaterialCommunityIcons
						name="crown"
						testID="icon-crown"
						size={48}
						color={colors.premiumGold}
					/>
					<Text style={styles.title}>{gameTitle}</Text>
					<Text style={styles.desc}>このゲームは WaiPa プレミアムで遊べます。</Text>
					<View style={styles.buttonWrap}>
						<GradientButton
							title="プレミアムにアップグレード"
							onPress={handleUpgrade}
						/>
					</View>
					<Pressable
						accessibilityRole="button"
						onPress={onClose}
						style={styles.closeLink}
					>
						<Text style={styles.closeLinkText}>とじる</Text>
					</Pressable>
				</Pressable>
			</Pressable>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	sheet: {
		width: '100%',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.lg,
		padding: spacing.xl,
		alignItems: 'center',
		gap: spacing.md,
	},
	title: { ...typography.title, textAlign: 'center' },
	desc: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
	buttonWrap: { alignSelf: 'stretch' },
	closeLink: { padding: spacing.sm },
	closeLinkText: { ...typography.body, color: colors.textMuted, fontWeight: '700' },
})
