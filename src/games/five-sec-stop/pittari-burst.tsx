import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from 'react-native-reanimated'
import { colors } from '@/theme/tokens'
import { FSS } from './theme'

const PIECE_COLORS = [colors.gold, colors.accentFrom, colors.accentTo, FSS.accent]
const PIECE_COUNT = 12
const FALL_MS = 1200

// ぴったり賞の紙吹雪。index 由来の決定的な配置（乱数なし）でテストしやすくする
function Piece({ index }: { index: number }) {
	const progress = useSharedValue(0)

	useEffect(() => {
		progress.value = withDelay(index * 40, withTiming(1, { duration: FALL_MS }))
	}, [index, progress])

	const style = useAnimatedStyle(() => ({
		opacity: 1 - progress.value,
		transform: [
			{ translateY: progress.value * 180 },
			{ translateX: (index - PIECE_COUNT / 2) * 6 * progress.value },
			{ rotate: `${progress.value * (index % 2 === 0 ? 360 : -360)}deg` },
		],
	}))

	return (
		<Animated.View
			style={[
				styles.piece,
				{
					left: `${(index * 83) % 100}%`,
					backgroundColor: PIECE_COLORS[index % PIECE_COLORS.length],
				},
				style,
			]}
		/>
	)
}

export function PittariBurst() {
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill} testID="pittari-burst">
			{Array.from({ length: PIECE_COUNT }, (_, i) => (
				<Piece key={i} index={i} />
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	piece: {
		position: 'absolute',
		top: 0,
		width: 8,
		height: 8,
		borderRadius: 2,
	},
})
