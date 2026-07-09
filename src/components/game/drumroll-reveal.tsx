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
import { lottieAssets } from './lottie-assets'
import { LottieEffect } from './lottie-effect'
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
				<LottieEffect
					source={lottieAssets.drumrollLoop}
					loop
					style={styles.effect}
					fallback={
						<Animated.Text style={[styles.question, pulseStyle]}>？？？</Animated.Text>
					}
				/>
			</View>
		)
	}
	if (phase === 'revealed') {
		return (
			<View style={styles.center}>
				{/* 紙吹雪等は背面レイヤー。素材未登録なら何も出さず現行と同じ見た目 */}
				<LottieEffect source={lottieAssets.celebrate} style={StyleSheet.absoluteFill} />
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
	effect: { width: 160, height: 120 },
})
