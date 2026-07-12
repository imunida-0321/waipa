import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { LUCKY_PUNISHMENT_ID } from './punishments'
import type { Punish } from './reducer'
import { NS } from './theme'

type Props = {
	punish: Punish
	playerName: string
	playerIndex: number
	onDone: () => void
}

// ペア成立/ジョーカー兼用の罰発表オーバーレイ（効果音＋バイブ）
export function PunishReveal({ punish, playerName, playerIndex, onDone }: Props) {
	const isJoker = punish.kind === 'joker'
	const isLucky = punish.punishmentId === LUCKY_PUNISHMENT_ID

	useEffect(() => {
		haptics.heavy()
		playSound(isJoker ? 'explosion' : 'reveal')
	}, [isJoker])

	const nameColor = playerColor(playerIndex).value

	return (
		<View style={[styles.backdrop, isJoker && styles.jokerBackdrop]}>
			<Text style={[styles.badge, isJoker && styles.jokerBadge]}>
				{isJoker ? '🃏 特大罰' : '罰ゲーム'}
			</Text>
			<View style={[styles.card, isJoker && styles.jokerCard]}>
				<Text style={styles.punishText}>{punish.text}</Text>
			</View>
			{isLucky ? (
				<Text style={styles.aori}>
					<Text style={{ color: nameColor }}>{playerName}さん</Text>
					、ラッキー！全員から拍手！
				</Text>
			) : isJoker ? (
				<Text style={styles.aori}>
					<Text style={{ color: nameColor }}>{playerName}さんが実行！</Text>
				</Text>
			) : (
				<Text style={styles.aori}>
					<Text style={{ color: nameColor }}>{playerName}さん</Text>、誰にやらせる？
				</Text>
			)}
			<GradientButton title="実行した！" onPress={onDone} />
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10,8,24,0.94)',
		alignItems: 'stretch',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	jokerBackdrop: { backgroundColor: 'rgba(26,6,32,0.96)' },
	badge: {
		...typography.caption,
		color: NS.rose,
		textAlign: 'center',
		fontWeight: '700',
		letterSpacing: 2,
	},
	jokerBadge: { color: NS.jokerPurple, fontSize: 16 },
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: NS.rose,
		borderRadius: radii.lg,
		padding: spacing.lg,
	},
	jokerCard: { borderColor: NS.jokerPurple, borderWidth: 2 },
	punishText: { ...typography.title, textAlign: 'center', lineHeight: 32 },
	aori: { ...typography.title, textAlign: 'center' },
})
