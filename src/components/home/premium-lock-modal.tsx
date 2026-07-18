import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	gameTitle: string
	onClose: () => void
}

// プレミアム限定ゲーム（全体ロック）の案内スタブ。
// アップグレード導線（購入フロー）は RevenueCat (#7) 実装時にここへ接続する
export function PremiumLockModal({ visible, gameTitle, onClose }: Props) {
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
					<View style={styles.badge}>
						<Text style={styles.badgeText}>近日対応予定</Text>
					</View>
					<GradientButton title="とじる" onPress={onClose} />
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
	badge: {
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
	},
	badgeText: { ...typography.caption, color: colors.premiumGold },
})
