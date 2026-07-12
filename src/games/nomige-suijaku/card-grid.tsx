import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, type ReactNode } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	View,
	type DimensionValue,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing } from '@/theme/tokens'
import { cardImageSource, JOKER_IMAGE } from './card-assets'
import type { Card, Suit } from './engine'
import { NS } from './theme'

const FLIP_MS = 200
export const MATCH_ANIM_MS = 1000

type Props = {
	cards: Card[]
	columns: number
	matchAnimIds: string[] // 成立クロスフェード中のカード（このカードにだけ罰テキストを出す）
	onFlip: (cardId: string) => void
	disabled?: boolean
}

// 盤面グリッド。カードの状態はすべて props（reducer の cards）から描画する
export function CardGrid({ cards, columns, matchAnimIds, onFlip, disabled = false }: Props) {
	// columns 列に収まるセル幅（%）。gap ぶんの余白を引く
	const widthPercent: DimensionValue = `${Math.floor(100 / columns) - 2}%`
	return (
		<View style={styles.grid}>
			{cards.map((card, i) => (
				<CardCell
					key={card.id}
					card={card}
					position={i + 1}
					width={widthPercent}
					matchAnim={matchAnimIds.includes(card.id)}
					onPress={() => {
						if (disabled || card.state !== 'hidden') return
						haptics.tap()
						onFlip(card.id)
					}}
				/>
			))}
		</View>
	)
}

function CardCell({
	card,
	position,
	width,
	matchAnim,
	onPress,
}: {
	card: Card
	position: number
	width: DimensionValue
	matchAnim: boolean
	onPress: () => void
}) {
	if (card.state === 'removed') {
		return <View style={[styles.cell, { width }, styles.removed]} accessibilityLabel={`カード${position}`} />
	}
	if (card.state === 'hidden') {
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`カード${position}`}
				onPress={onPress}
				style={[styles.cell, { width }]}
			>
				<LinearGradient
					colors={[colors.accentFrom, colors.accentTo]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.back}
				>
					<View style={styles.backInner}>
						<Text style={styles.backText}>WaiPa</Text>
					</View>
				</LinearGradient>
			</Pressable>
		)
	}

	const isJoker = card.rank === 'JOKER'
	return (
		<View
			accessibilityLabel={`カード${position}`}
			style={[styles.cell, { width }]}
		>
			<FlipIn style={[styles.face, isJoker && styles.jokerFace]}>
				{matchAnim ? (
					<MatchCrossfade image={cardImageSource(card.rank, card.suit as Suit)}>
						<Text style={styles.punishText} numberOfLines={3}>
							{card.punishment}
						</Text>
					</MatchCrossfade>
				) : (
					<>
						<Image
							source={isJoker ? JOKER_IMAGE : cardImageSource(card.rank, card.suit as Suit)}
							style={styles.image}
							contentFit="contain"
						/>
						{isJoker && (
							<View style={styles.jokerTint}>
								<Text style={styles.jokerLabel}>JOKER</Text>
							</View>
						)}
					</>
				)}
			</FlipIn>
		</View>
	)
}

// 表になった瞬間の rotateY 90°→0° フリップイン
function FlipIn({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
	const angle = useSharedValue(90)
	useEffect(() => {
		angle.value = withTiming(0, { duration: FLIP_MS })
	}, [angle])
	const anim = useAnimatedStyle(() => ({
		transform: [{ perspective: 600 }, { rotateY: `${angle.value}deg` }],
	}))
	return <Animated.View style={[styles.fill, style, anim]}>{children}</Animated.View>
}

// 成立演出: 絵柄がフェードアウトし、罰テキストがうっすら浮かび上がるクロスフェード
function MatchCrossfade({ image, children }: { image: number; children: ReactNode }) {
	const progress = useSharedValue(0)
	useEffect(() => {
		progress.value = withTiming(1, { duration: MATCH_ANIM_MS })
	}, [progress])
	const imageStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value * 0.85 }))
	const textStyle = useAnimatedStyle(() => ({ opacity: progress.value }))
	return (
		<View style={[styles.fill, styles.matchedFace]}>
			<Animated.View style={[styles.fill, imageStyle]}>
				<Image source={image} style={styles.image} contentFit="contain" />
			</Animated.View>
			<Animated.View style={[styles.fill, styles.punishOverlay, textStyle]}>
				{children}
			</Animated.View>
		</View>
	)
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
		justifyContent: 'center',
		alignContent: 'center',
		flex: 1,
	},
	cell: {
		aspectRatio: 0.7, // 素材（250×360）に合わせた縦長
		borderRadius: radii.sm,
		overflow: 'hidden',
	},
	fill: { ...StyleSheet.absoluteFillObject },
	back: { flex: 1, padding: 3 },
	backInner: {
		flex: 1,
		borderRadius: radii.sm - 2,
		backgroundColor: colors.background,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backText: { fontSize: 12, fontWeight: '800', color: colors.accentFrom },
	face: { backgroundColor: NS.cardFace, borderRadius: radii.sm },
	image: { ...StyleSheet.absoluteFillObject },
	jokerFace: { borderWidth: 2, borderColor: NS.rose },
	jokerTint: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(80, 20, 90, 0.45)',
		justifyContent: 'flex-end',
		alignItems: 'center',
		paddingBottom: spacing.xs,
	},
	jokerLabel: { fontSize: 11, fontWeight: '800', color: NS.rose, letterSpacing: 2 },
	matchedFace: { backgroundColor: NS.matchedFace },
	punishOverlay: { alignItems: 'center', justifyContent: 'center', padding: spacing.xs },
	punishText: {
		fontSize: 11,
		fontWeight: '700',
		color: NS.punishInk,
		textAlign: 'center',
	},
	removed: { borderWidth: 1, borderColor: colors.surfaceBorder, opacity: 0.2 },
})
