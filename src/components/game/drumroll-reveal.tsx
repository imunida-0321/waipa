import type { PropsWithChildren } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { typography } from '@/theme/tokens'
import type { DrumrollPhase } from './use-drumroll'

type Props = PropsWithChildren<{ phase: DrumrollPhase }>

// rolling: 「？？？」がドクドク脈打つ / revealed: children がドン！とスケールイン
export function DrumrollReveal({ phase, children }: Props) {
	const pulse = useSharedValue(1)
	const pop = useSharedValue(0)

	useEffect(() => {
		if (phase === 'rolling') {
			pulse.value = withRepeat(
				withSequence(withTiming(1.15, { duration: 240 }), withTiming(1, { duration: 240 })),
				-1,
			)
		}
		if (phase === 'revealed') {
			pop.value = withSpring(1, { damping: 9 })
		}
		if (phase === 'idle') {
			pop.value = 0
		}
	}, [phase, pulse, pop])

	const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))
	const popStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pop.value }],
		opacity: pop.value,
	}))

	if (phase === 'rolling') {
		return (
			<View style={styles.center}>
				<Animated.Text style={[styles.question, pulseStyle]}>？？？</Animated.Text>
			</View>
		)
	}
	if (phase === 'revealed') {
		return (
			<View style={styles.center}>
				<Animated.View style={popStyle}>{children}</Animated.View>
			</View>
		)
	}
	return (
		<View style={styles.center}>
			<Text style={typography.caption}>　</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	center: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
	question: { ...typography.hero, fontSize: 48 },
})
