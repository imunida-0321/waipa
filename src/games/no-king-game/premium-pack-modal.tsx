import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { AD_UNIT_IDS } from '@/constants/ads'
import { useRewardedAd } from '@/lib/gma'
import { packUnlockStore, usePackUnlocked } from '@/lib/pack-unlock-store'
import { getTopicsByPack, topicsStore } from '@/lib/topics-store'
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
	const [fetchFailed, setFetchFailed] = useState(false)

	const unlockIfTopicsAvailable = useCallback(() => {
		if (getTopicsByPack(KING_PREMIUM_PACK).length > 0) {
			packUnlockStore.unlock(KING_PREMIUM_PACK)
			return true
		}
		return false
	}, [])

	const retryFetch = useCallback(async () => {
		setFetchFailed(false)
		if (unlockIfTopicsAvailable()) return
		const ok = await topicsStore.refreshPremiumPack(KING_PREMIUM_PACK)
		if (ok) {
			packUnlockStore.unlock(KING_PREMIUM_PACK)
			return
		}
		setFetchFailed(true)
	}, [unlockIfTopicsAvailable])

	useEffect(() => {
		if (visible && !unlocked) {
			load()
			topicsStore.refreshPremiumPack(KING_PREMIUM_PACK)
		}
	}, [visible, unlocked, load])

	useEffect(() => {
		if (!isEarnedReward) return
		if (unlockIfTopicsAvailable()) return
		void topicsStore.refreshPremiumPack(KING_PREMIUM_PACK).then((ok) => {
			if (ok) {
				setFetchFailed(false)
				packUnlockStore.unlock(KING_PREMIUM_PACK)
				return
			}
			setFetchFailed(true)
		})
	}, [isEarnedReward, unlockIfTopicsAvailable])

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
							{fetchFailed ? (
								<>
									<Text style={styles.error}>お題の取得に失敗しました</Text>
									<Pressable
										accessibilityRole="button"
										onPress={retryFetch}
										style={styles.retry}
									>
										<Text style={styles.retryText}>再試行</Text>
									</Pressable>
								</>
							) : null}
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
	error: { ...typography.body, color: colors.danger, textAlign: 'center' },
	retry: {
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
	},
	retryText: { ...typography.body, color: colors.text },
	close: { ...typography.body, color: colors.textMuted, padding: spacing.sm },
})
