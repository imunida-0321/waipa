import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing } from '@/theme/tokens'
import type { Card } from './engine'
import { RP } from './theme'

const FLIP_MS = 200

type Props = {
	cards: Card[]
	onFlip: (cardId: string) => void
	disabled?: boolean
}

// 4×4 盤面。カードの状態はすべて props（reducer の cards）から描画する
export function CardGrid({ cards, onFlip, disabled = false }: Props) {
	return (
		<View style={styles.grid}>
			{cards.map((card, i) => (
				<CardCell
					key={card.id}
					card={card}
					position={i + 1}
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
	onPress,
}: {
	card: Card
	position: number
	onPress: () => void
}) {
	if (card.state === 'removed') {
		return <View style={[styles.cell, styles.removed]} />
	}
	if (card.state === 'hidden') {
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`カード${position}`}
				onPress={onPress}
				style={styles.cell}
			>
				<LinearGradient
					colors={[colors.accentFrom, colors.accentTo]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.back}
				>
					<Text style={styles.backText}>W</Text>
				</LinearGradient>
			</Pressable>
		)
	}
	const isJoker = card.kind === 'joker'
	const isLucky = card.kind === 'lucky'
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={card.symbol}
			onPress={onPress}
			style={styles.cell}
		>
			<FlipIn
				style={[
					styles.faceFill,
					styles.face,
					isJoker && styles.jokerFace,
					isLucky && styles.luckyFace,
				]}
			>
				<Text style={styles.symbol}>{card.symbol}</Text>
				{isJoker && <Text style={styles.jokerLabel}>JOKER</Text>}
				{isLucky && <Text style={styles.luckyLabel}>LUCKY</Text>}
			</FlipIn>
		</Pressable>
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
	return <Animated.View style={[style, anim]}>{children}</Animated.View>
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
		justifyContent: 'center',
	},
	cell: {
		width: '22%',
		aspectRatio: 0.72,
		borderRadius: radii.md,
		overflow: 'hidden',
	},
	back: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backText: { fontSize: 28, fontWeight: '800', color: colors.text, opacity: 0.85 },
	faceFill: { flex: 1, borderRadius: radii.md },
	face: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: RP.green,
		alignItems: 'center',
		justifyContent: 'center',
	},
	jokerFace: { borderColor: RP.joker, backgroundColor: '#2A1024' },
	luckyFace: { borderColor: RP.lucky, backgroundColor: '#2A2210' },
	symbol: { fontSize: 34 },
	jokerLabel: { fontSize: 11, fontWeight: '800', color: RP.joker, marginTop: 2 },
	luckyLabel: { fontSize: 11, fontWeight: '800', color: RP.lucky, marginTop: 2 },
	removed: {
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		opacity: 0.25,
	},
})
