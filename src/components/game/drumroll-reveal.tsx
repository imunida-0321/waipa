import type { PropsWithChildren } from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'
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

type Props = PropsWithChildren<{
	phase: DrumrollPhase
	/** false で Lottie 素材を使わず reanimated 演出のみにする（5秒STOP の隠しタイマー等、集中を要する画面向け） */
	lottie?: boolean
}>

// rolling: 「？？？」がドクドク脈打つ / revealed: children がドン！とスケールイン
export function DrumrollReveal({ phase, children, lottie = true }: Props) {
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
					source={lottie ? lottieAssets.drumrollLoop : null}
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
				{lottie && (
					<LottieEffect source={lottieAssets.celebrate} style={styles.celebrate} />
				)}
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
	// 紙吹雪は画面全体に降らせる。DrumrollReveal は画面中央付近に置かれる前提で
	// ウィンドウサイズ分を上方向へ広げて重ねる（タップは LottieEffect 側で透過）
	celebrate: {
		position: 'absolute',
		alignSelf: 'center',
		width: Dimensions.get('window').width,
		height: Dimensions.get('window').height,
		top: -Dimensions.get('window').height / 2 + 60,
	},
})
