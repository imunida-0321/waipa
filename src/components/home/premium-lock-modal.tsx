import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { GlassSurface } from '@/components/ui/glass-surface'
import { AD_UNIT_IDS } from '@/constants/ads'
import { useRewardedAd } from '@/lib/gma'
import { trialStore, useTrialOffer } from '@/lib/trial-store'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	gameId: string
	gameTitle: string
	onClose: () => void
}

// プレミアム限定ゲームの案内。閉じてから遷移し、背後にモーダルを残さない
export function PremiumLockModal({ visible, gameId, gameTitle, onClose }: Props) {
	const { canOffer, used } = useTrialOffer(gameId)
	const { isLoaded, isEarnedReward, load, show } = useRewardedAd(AD_UNIT_IDS.trialRewarded)
	const rewardHandled = useRef(false)

	function handleUpgrade() {
		onClose()
		router.push('/paywall')
	}

	useEffect(() => {
		if (visible && canOffer) {
			load()
		}
	}, [visible, canOffer, load])

	// 新しい動画の load で SDK が isEarnedReward を false に戻したら次の獲得を受け付ける。
	// 前のゲームの獲得状態が残ったまま開き直しても、視聴なしで誤って開始しないための二重ガード
	useEffect(() => {
		if (!isEarnedReward) {
			rewardHandled.current = false
		}
	}, [isEarnedReward])

	useEffect(() => {
		if (!visible || !isEarnedReward || rewardHandled.current) return
		rewardHandled.current = true
		void trialStore.startTrial(gameId).then(() => {
			onClose()
			router.push(`/game/${gameId}`)
		})
	}, [gameId, isEarnedReward, onClose, visible])

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheetWrap} onPress={() => {}}>
					<GlassSurface variant="overlay" style={styles.sheet}>
						<MaterialCommunityIcons
							name="crown"
							testID="icon-crown"
							size={48}
							color={colors.premiumGold}
						/>
						<Text style={styles.title}>{gameTitle}</Text>
						<Text style={styles.desc}>このゲームは WaiPa プレミアムで遊べます。</Text>
						{canOffer ? (
							<>
								<Text style={styles.desc}>
									動画を見ると2ラウンドだけお試しできます。お試しは1回だけです。
								</Text>
								<View style={styles.buttonWrap}>
									<GradientButton
										title="動画を見てお試しプレイ"
										disabled={!isLoaded}
										onPress={() => show()}
									/>
								</View>
							</>
						) : null}
						{used ? <Text style={styles.trialUsed}>お試しプレイは利用済みです</Text> : null}
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
					</GlassSurface>
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
	sheetWrap: { width: '100%' },
	sheet: {
		borderRadius: radii.lg,
		padding: spacing.xl,
		alignItems: 'center',
		gap: spacing.md,
	},
	title: { ...typography.title, textAlign: 'center' },
	desc: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
	trialUsed: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
	buttonWrap: { alignSelf: 'stretch' },
	closeLink: { padding: spacing.sm },
	closeLinkText: { ...typography.body, color: colors.textMuted, fontWeight: '700' },
})
