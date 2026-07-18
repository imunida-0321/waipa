import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect } from 'react'
import { Modal, Pressable, StyleSheet, Text } from 'react-native'
import { useRewardedAd } from 'react-native-google-mobile-ads'
import { GradientButton } from '@/components/ui/gradient-button'
import { AD_UNIT_IDS } from '@/constants/ads'
import { packUnlockStore, usePackUnlocked } from '@/lib/pack-unlock-store'
import { topicsStore } from '@/lib/topics-store'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { KING_PREMIUM_PACK } from './engine'

type Props = {
	visible: boolean
	onClose: () => void
}

// 限定お題パック（king_premium）の解放モーダル。
// 動画リワード視聴でこのゲームセッション中のみ解放（退出で再ロック）。プレミアムは常時解放
export function PremiumPackModal({ visible, onClose }: Props) {
	const unlocked = usePackUnlocked(KING_PREMIUM_PACK)
	const { isLoaded, isEarnedReward, load, show } = useRewardedAd(AD_UNIT_IDS.packUnlockRewarded)

	useEffect(() => {
		if (visible && !unlocked) load()
	}, [visible, unlocked, load])

	useEffect(() => {
		if (isEarnedReward) {
			packUnlockStore.unlock(KING_PREMIUM_PACK)
			topicsStore.refreshPremiumPack(KING_PREMIUM_PACK)
		}
	}, [isEarnedReward])

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={() => {}}>
					<MaterialCommunityIcons
						name={unlocked ? 'lock-open-variant' : 'lock'}
						testID={unlocked ? 'icon-lock-open' : 'icon-lock'}
						size={48}
						color={colors.premiumGold}
					/>
					<Text style={styles.title}>限定お題パック</Text>
					{unlocked ? (
						<Text style={styles.desc}>
							このセッション中は解放中！{'\n'}
							ドキドキ度アップの限定お題が混ざります。
						</Text>
					) : (
						<>
							<Text style={styles.desc}>
								ドキドキ度アップの限定お題が遊べるパックです。{'\n'}
								動画を見るとこのセッション中だけ解放されます。
							</Text>
							<GradientButton
								title="動画を見て解放する"
								disabled={!isLoaded}
								onPress={() => show()}
							/>
						</>
					)}
					<Pressable accessibilityRole="button" onPress={onClose}>
						<Text style={styles.close}>とじる</Text>
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
	close: { ...typography.body, color: colors.textMuted, padding: spacing.sm },
})
