import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { usePremium } from '@/lib/premium'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	game: GameMeta
	onPress: () => void
}

// ゲーム一覧のカード。cardThumbnail があれば画像（タイトル入りキービジュアル前提で文字は重ねない）、
// なければテーマ色グラデ＋絵文字のフォールバック（イントロ用 thumbnail とは独立）。
// プレミアム限定ゲームは未解放の間、薄い黒マスク＋👑バッジを重ねて課金枠だと分かるようにする
export function GameCard({ game, onPress }: Props) {
	const premiumUnlocked = usePremium()
	const locked = game.premium === true && !premiumUnlocked
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={game.title}
			onPress={onPress}
			style={({ pressed }) => [styles.container, pressed && styles.pressed]}
		>
			<View style={styles.thumbWrap}>
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
				{locked && (
					<View testID="premium-lock-mask" style={styles.lockMask}>
						<View style={styles.lockBadge}>
							<MaterialCommunityIcons
								name="crown"
								testID="icon-crown"
								size={13}
								color={colors.premiumGold}
							/>
							<Text style={styles.lockBadgeText}>プレミアム</Text>
						</View>
					</View>
				)}
			</View>
			<Text style={styles.tagline} numberOfLines={2}>
				{game.tagline}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: { width: '48%', marginBottom: spacing.lg },
	pressed: { opacity: 0.8 },
	thumbWrap: { position: 'relative' },
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
	lockMask: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10, 8, 20, 0.55)',
		borderRadius: radii.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	lockBadge: {
		backgroundColor: 'rgba(23, 20, 42, 0.9)',
		borderWidth: 1,
		borderColor: colors.premiumGold,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	lockBadgeText: { ...typography.caption, color: colors.premiumGold },
	emoji: { fontSize: 40 },
	title: { ...typography.body, fontWeight: '800', textAlign: 'center' },
	tagline: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
})
