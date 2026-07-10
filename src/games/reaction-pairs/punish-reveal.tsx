import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { RP } from './theme'

type Props = {
	playerName: string
	playerIndex: number
	topicText: string
	onDone: () => void
}

// ルーレット確定後の罰発表オーバーレイ
export function PunishReveal({ playerName, playerIndex, topicText, onDone }: Props) {
	useEffect(() => {
		haptics.heavy()
		playSound('reveal')
	}, [])

	const playerColorValue = playerColor(playerIndex).value

	return (
		<View style={styles.backdrop}>
			<Text style={[styles.who, { color: playerColorValue }]}>{playerName}さんが罰！</Text>
			<View style={styles.card}>
				<Text style={styles.topic}>{topicText}</Text>
			</View>
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
	who: { ...typography.hero, textAlign: 'center' },
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: RP.green,
		borderRadius: radii.lg,
		padding: spacing.lg,
	},
	topic: { ...typography.title, textAlign: 'center', lineHeight: 32 },
})
