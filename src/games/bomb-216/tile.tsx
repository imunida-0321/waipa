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

const FACE: Record<Exclude<TileState, 'hidden'>, string> = {
	safe: '🍀',
	solo: '💣',
	all: '💥',
}

// 1タイル。未開封はグロッシーな赤ボタン、開封後はくぼみ＋絵文字。
// 開封時にポップ（縮んで戻る）アニメ、爆弾は拡大フラッシュ
export function Tile({ index, state, revealed, bombKind = null, onPress }: Props) {
	const scale = useSharedValue(1)
	const opened = state !== 'hidden'
	const isBombFace = state === 'solo' || state === 'all'

	useEffect(() => {
		if (!opened) return
		scale.value = withSequence(
			withTiming(isBombFace ? 1.25 : 0.8, { duration: 90 }),
			withTiming(1, { duration: 160 }),
		)
	}, [opened, isBombFace, scale])

	const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

	// リザルト全公開: 未開封マスの中身を薄く見せる
	const ghostFace = revealed && !opened ? FACE[bombKind ?? 'safe'] : null
	const disabled = opened || revealed

	return (
		<Animated.View style={[styles.wrap, animatedStyle]}>
			<Pressable
				accessibilityRole="button"
				disabled={disabled}
				onPress={() => onPress(index)}
				style={styles.press}
			>
				{ghostFace !== null ? (
					<View style={[styles.socket, styles.ghost]}>
						<Text style={styles.face}>{ghostFace}</Text>
					</View>
				) : opened ? (
					<View style={[styles.socket, isBombFace && styles.bombSocket]}>
						<Text style={styles.face}>
							{FACE[state as Exclude<TileState, 'hidden'>]}
						</Text>
					</View>
				) : (
					<View style={styles.btnEdge}>
						<LinearGradient
							colors={[BOMB.btnFaceTop, BOMB.btnFaceBottom]}
							style={styles.btnFace}
						>
							<View style={styles.gloss} />
							<Text style={styles.number}>{index + 1}</Text>
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
	number: { fontSize: 13, fontWeight: '700', color: 'rgba(255,235,230,0.65)' },
	// 開封後のくぼみ
	socket: {
		flex: 1,
		borderRadius: 14,
		backgroundColor: BOMB.socket,
		alignItems: 'center',
		justifyContent: 'center',
	},
	bombSocket: { backgroundColor: BOMB.accentDeep },
	ghost: { opacity: 0.5 },
	face: { fontSize: 26 },
})
