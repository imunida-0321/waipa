import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	game: GameMeta
	onPress: () => void
}

// ゲーム一覧のカード。サムネ画像が用意されるまでテーマ色グラデ＋絵文字で仮組（決定事項）
export function GameCard({ game, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [styles.container, pressed && styles.pressed]}
		>
			<LinearGradient
				colors={[game.gradient[0], game.gradient[1]]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.thumb}
			>
				<Text style={styles.emoji}>{game.emoji}</Text>
				<Text style={styles.title} numberOfLines={2}>
					{game.title}
				</Text>
			</LinearGradient>
			<Text style={styles.tagline} numberOfLines={2}>
				{game.tagline}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: { width: '48%', marginBottom: spacing.lg },
	pressed: { opacity: 0.8 },
	thumb: {
		aspectRatio: 1.3,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.xs,
		padding: spacing.sm,
	},
	emoji: { fontSize: 40 },
	title: { ...typography.body, fontWeight: '800', textAlign: 'center' },
	tagline: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
})
