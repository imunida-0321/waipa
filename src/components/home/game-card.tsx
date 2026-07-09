import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	game: GameMeta
	onPress: () => void
}

// ゲーム一覧のカード。cardThumbnail があれば画像（タイトル入りキービジュアル前提で文字は重ねない）、
// なければテーマ色グラデ＋絵文字のフォールバック（イントロ用 thumbnail とは独立）
export function GameCard({ game, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={game.title}
			onPress={onPress}
			style={({ pressed }) => [styles.container, pressed && styles.pressed]}
		>
			{game.cardThumbnail !== undefined ? (
				<Image
					testID="card-thumb-image"
					source={game.cardThumbnail}
					style={styles.thumbImage}
					contentFit="cover"
				/>
			) : (
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
			)}
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
	thumbImage: {
		aspectRatio: 1.3,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
	},
	emoji: { fontSize: 40 },
	title: { ...typography.body, fontWeight: '800', textAlign: 'center' },
	tagline: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
})
