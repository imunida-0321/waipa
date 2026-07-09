import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { EVENT_META, type EventId } from './events'

export const CUTIN_DURATION_MS = 1400

type Props = {
	event: EventId
	onDone: () => void
}

// 全画面カットイン。オーバーレイが下の盤面へのタップを遮る
export function EventCutin({ event, onDone }: Props) {
	const scale = useSharedValue(0.3)

	useEffect(() => {
		playSound('event')
		haptics.heavy()
		scale.value = withSequence(
			withTiming(1.15, { duration: 250, easing: Easing.out(Easing.cubic) }),
			withTiming(1, { duration: 150 }),
		)
		const timer = setTimeout(onDone, CUTIN_DURATION_MS)
		return () => clearTimeout(timer)
		// マウント時に一度だけ発火させる（onDone の identity 変化で再発火させない）
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
	const meta = EVENT_META[event]

	return (
		<View style={styles.backdrop}>
			<Animated.View style={[styles.card, animatedStyle]}>
				<Text style={styles.emoji}>{meta.emoji}</Text>
				<Text style={styles.label}>きまぐれ発動！</Text>
				<Text style={styles.name}>{meta.name}</Text>
			</Animated.View>
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(10,8,24,0.85)',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 10,
	},
	card: {
		alignItems: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.xl,
		paddingHorizontal: spacing.xl,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		backgroundColor: colors.surface,
	},
	emoji: { fontSize: 72 },
	label: { ...typography.caption, color: colors.accentFrom },
	name: { ...typography.hero },
})
