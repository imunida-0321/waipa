import { StyleSheet, Text, View } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { formatPlayerCount } from '@/lib/format-players'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	game: GameMeta
}

// サムネ左上に重ねる人数ピル（モック準拠: 半透明黒＋白 caption）
export function PlayerCountBadge({ game }: Props) {
	return (
		<View testID="player-count-badge" style={styles.badge}>
			<Text style={styles.text}>{formatPlayerCount(game.minPlayers, game.maxPlayers)}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		position: 'absolute',
		top: spacing.sm,
		left: spacing.sm,
		backgroundColor: 'rgba(0, 0, 0, 0.28)',
		borderRadius: radii.pill,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
	},
	text: { ...typography.caption, color: colors.text },
})
