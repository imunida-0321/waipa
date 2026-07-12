import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from 'react-native-reanimated'
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

const REST_FADE_DELAY_MS = 200
const REST_FADE_MS = 250

// ペア成立/ジョーカー兼用の罰発表オーバーレイ（ズーム入場＋効果音＋バイブ）
export function PunishReveal({ punish, playerName, playerIndex, onDone }: Props) {
	const isJoker = punish.kind === 'joker'
	const isLucky = punish.punishmentId === LUCKY_PUNISHMENT_ID

	useEffect(() => {
		haptics.heavy()
		playSound(isJoker ? 'explosion' : 'reveal')
	}, [isJoker])

	// 罰テキストカード: 「ドン！」と勢いよくズームイン
	const cardScale = useSharedValue(0.3)
	const cardOpacity = useSharedValue(0)
	// バッジ／煽り／ボタンはカードに少し遅れてフェードイン
	const restOpacity = useSharedValue(0)
	useEffect(() => {
		cardScale.value = withSpring(1, { damping: 12, stiffness: 180 })
		cardOpacity.value = withTiming(1, { duration: 300 })
		restOpacity.value = withDelay(REST_FADE_DELAY_MS, withTiming(1, { duration: REST_FADE_MS }))
	}, [cardScale, cardOpacity, restOpacity])

	const cardAnim = useAnimatedStyle(() => ({
		opacity: cardOpacity.value,
		transform: [{ scale: cardScale.value }],
	}))
	const restAnim = useAnimatedStyle(() => ({ opacity: restOpacity.value }))

	const nameColor = playerColor(playerIndex).value

	return (
		<View style={[styles.backdrop, isJoker && styles.jokerBackdrop]}>
			<Animated.View style={restAnim}>
				<Text style={[styles.badge, isJoker && styles.jokerBadge]}>
					{isJoker ? '🃏 特大罰' : '罰ゲーム'}
				</Text>
			</Animated.View>
			<Animated.View style={[styles.card, isJoker && styles.jokerCard, cardAnim]}>
				<Text style={styles.punishText}>{punish.text}</Text>
			</Animated.View>
			<Animated.View style={restAnim}>
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
			</Animated.View>
			<Animated.View style={restAnim}>
				<GradientButton title="実行した！" onPress={onDone} />
			</Animated.View>
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
