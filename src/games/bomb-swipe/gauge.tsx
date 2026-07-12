import { LinearGradient } from 'expo-linear-gradient'
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { scoreFromDrag } from './engine'
import { BS } from './theme'

type Props = {
	onScoreChange: (score: number) => void
	onRelease: (score: number) => void
}

// スワイプゲージ。タッチ追跡と数字表示だけを担い、爆発判定・演出は親が行う。
// gesture-handler はコードベース未導入のため RN 標準の responder を使う
export function SwipeGauge({ onScoreChange, onRelease }: Props) {
	const [score, setScore] = useState(0)
	const trackHeight = useRef(0)
	const startY = useRef(0)
	const current = useRef(0)

	const update = (pageY: number) => {
		const next = scoreFromDrag(startY.current - pageY, trackHeight.current)
		current.current = next
		setScore(next)
		onScoreChange(next)
	}

	return (
		<View
			testID="swipe-gauge"
			style={styles.track}
			onLayout={(e) => {
				trackHeight.current = e.nativeEvent.layout.height
			}}
			onStartShouldSetResponder={() => true}
			onResponderGrant={(e) => {
				startY.current = e.nativeEvent.pageY
				update(e.nativeEvent.pageY)
			}}
			onResponderMove={(e) => update(e.nativeEvent.pageY)}
			onResponderRelease={() => onRelease(current.current)}
		>
			<View style={[StyleSheet.absoluteFill, styles.fillWrap]} pointerEvents="none">
				<LinearGradient
					colors={[BS.gaugeTo, BS.gaugeFrom]}
					style={[styles.fill, { height: `${score}%` }]}
				/>
			</View>
			<View style={styles.scoreWrap} pointerEvents="none">
				<Text style={styles.score}>{score}</Text>
				<Text style={styles.scoreCaption}>上にスワイプ！離した位置がスコア</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	track: {
		flex: 1,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.lg,
		overflow: 'hidden',
	},
	fillWrap: { justifyContent: 'flex-end' },
	fill: { width: '100%', opacity: 0.55 },
	scoreWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
	score: { fontSize: 96, fontWeight: '800', color: colors.text },
	scoreCaption: { ...typography.caption, marginTop: spacing.sm },
})
