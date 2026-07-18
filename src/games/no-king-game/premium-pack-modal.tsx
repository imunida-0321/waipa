import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	onClose: () => void
}

// 限定お題パック（king_premium）解放の案内スタブ。
// 解放ロジックは AdMob(#6) / RevenueCat(#7) 実装時にここへ接続する
export function PremiumPackModal({ visible, onClose }: Props) {
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={() => {}}>
					<MaterialCommunityIcons
						name="lock"
						testID="icon-lock"
						size={48}
						color={colors.text}
					/>
					<Text style={styles.title}>限定お題パック</Text>
					<Text style={styles.desc}>
						ドキドキ度アップの限定お題が遊べるパックです。{'\n'}
						広告視聴 または WaiPa プレミアムで解放できます。
					</Text>
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
		alignSelf: 'stretch',
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.lg,
		alignItems: 'center',
		gap: spacing.md,
	},
	title: { ...typography.title },
	desc: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
	badge: {
		backgroundColor: colors.background,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
	},
	badgeText: { ...typography.caption, color: colors.gold },
})
