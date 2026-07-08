import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import type { TileState } from './board'
import { BOMB } from './theme'

type Props = {
	index: number
	state: TileState
	revealed: boolean
	bombKind?: 'solo' | 'all' | null
	onPress: (index: number) => void
}

// リザルト全公開時に未開封の爆弾マスへ表示（開封演出は Lottie が担当）
const GHOST_FACE = { solo: '💣', all: '💥' } as const

// 1タイル。未開封はグロッシーな赤ボタン、開封後は無地のくぼみ。
// 開封時にポップ＋小刻みな揺れ、爆弾は拡大フラッシュ
export function Tile({ index, state, revealed, bombKind = null, onPress }: Props) {
	const scale = useSharedValue(1)
	const shift = useSharedValue(0)
	const opened = state !== 'hidden'
	const isBombFace = state === 'solo' || state === 'all'

	useEffect(() => {
		if (!opened) return
		scale.value = withSequence(
			withTiming(isBombFace ? 1.25 : 0.85, { duration: 90 }),
			withTiming(1, { duration: 160 }),
		)
		// 押した瞬間の小刻みな揺れ
		shift.value = withSequence(
			withTiming(-3, { duration: 40 }),
			withTiming(3, { duration: 40 }),
			withTiming(-2, { duration: 40 }),
			withTiming(0, { duration: 40 }),
		)
	}, [opened, isBombFace, scale, shift])

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }, { translateX: shift.value }],
	}))

	// リザルト全公開: 未開封の爆弾マスだけ場所を見せる
	const ghostFace = revealed && !opened && bombKind !== null ? GHOST_FACE[bombKind] : null
	const disabled = opened || revealed

	return (
		<Animated.View style={[styles.wrap, animatedStyle]}>
			<Pressable
				accessibilityRole="button"
				testID={`tile-${index}`}
				disabled={disabled}
				onPress={() => onPress(index)}
				style={styles.press}
			>
				{opened || ghostFace !== null ? (
					<View style={[styles.socket, isBombFace && styles.bombSocket]}>
						{ghostFace !== null && <Text style={styles.face}>{ghostFace}</Text>}
					</View>
				) : (
					<View style={styles.btnEdge}>
						<LinearGradient
							colors={[BOMB.btnFaceTop, BOMB.btnFaceBottom]}
							style={styles.btnFace}
						>
							<View style={styles.gloss} />
						</LinearGradient>
					</View>
				)}
			</Pressable>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	wrap: { width: '25%', aspectRatio: 1, padding: 6 },
	press: { flex: 1 },
	// 赤ボタン: 下端の濃い赤で厚みを出し、面はグラデ＋上部グロス
	btnEdge: {
		flex: 1,
		borderRadius: 14,
		backgroundColor: BOMB.btnEdge,
	},
	btnFace: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 4,
		borderRadius: 13,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	gloss: {
		position: 'absolute',
		top: 4,
		left: 6,
		right: 6,
		height: '30%',
		borderRadius: 8,
		backgroundColor: BOMB.btnGloss,
	},
	// 開封後のくぼみ
	socket: {
		flex: 1,
		borderRadius: 14,
		backgroundColor: BOMB.socket,
		alignItems: 'center',
		justifyContent: 'center',
	},
	bombSocket: { backgroundColor: BOMB.accentDeep },
	face: { fontSize: 26 },
})
