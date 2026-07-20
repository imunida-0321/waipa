import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { GameMeta } from '@/games/registry'
import { usePremium } from '@/lib/premium'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { PlayerCountBadge } from './player-count-badge'

type Props = {
	game: GameMeta
	onPress: () => void
}

// ゲーム一覧のカード。cardThumbnail があれば画像（タイトル入りキービジュアル前提で文字は重ねない）、
// なければテーマ色グラデ＋右上絵文字＋左下タイトルのフォールバック（Issue #44 モック準拠）。
// 人数バッジを左上に重ねる。カード下キャッチ（tagline）はサムネ下に表示する。
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
			<View testID="game-card-surface" style={styles.surface}>
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
					<PlayerCountBadge game={game} />
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
			</View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: { width: '100%', marginBottom: spacing.lg },
	pressed: { opacity: 0.8 },
	// サムネとキャッチを包むカード面（参考デザイン準拠）。枠線はこの面にだけ付ける
	surface: {
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.sm,
	},
	thumbWrap: { position: 'relative' },
	thumb: {
		aspectRatio: 1.3,
		borderRadius: radii.md,
		justifyContent: 'flex-end',
		padding: spacing.sm,
		overflow: 'hidden',
	},
	thumbImage: {
		aspectRatio: 1.3,
		borderRadius: radii.md,
	},
	lockMask: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10, 8, 20, 0.55)',
		borderRadius: radii.md,
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
	emoji: {
		position: 'absolute',
		top: spacing.xs,
		right: spacing.sm,
		fontSize: 44,
		opacity: 0.55,
	},
	title: { ...typography.body, fontWeight: '800', textAlign: 'left' },
	// 1行/2行のキャッチ混在でもカード高さが揃うよう常に2行分を確保（千鳥の段ずれ防止）
	tagline: {
		...typography.caption,
		fontSize: 12,
		lineHeight: 16,
		minHeight: 32,
		textAlign: 'center',
		marginTop: spacing.sm,
	},
})
