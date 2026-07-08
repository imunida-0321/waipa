import { useEffect } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
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

// 1タイル。開封時にポップ（縮んで戻る）アニメ、爆弾は拡大フラッシュ
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
				style={[
					styles.tile,
					opened && styles.open,
					isBombFace && styles.bomb,
					ghostFace !== null && styles.ghost,
				]}
			>
				{ghostFace !== null ? (
					<Text style={styles.face}>{ghostFace}</Text>
				) : opened ? (
					<Text style={styles.face}>{FACE[state as Exclude<TileState, 'hidden'>]}</Text>
				) : (
					<Text style={styles.number}>{index + 1}</Text>
				)}
			</Pressable>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	wrap: { width: '25%', aspectRatio: 1, padding: 5 },
	tile: {
		flex: 1,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: BOMB.tileBorder,
		backgroundColor: BOMB.tile,
		alignItems: 'center',
		justifyContent: 'center',
	},
	open: { backgroundColor: BOMB.tileOpen, borderColor: 'transparent' },
	bomb: { backgroundColor: BOMB.accentDeep, borderColor: BOMB.accent },
	ghost: { opacity: 0.45 },
	number: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
	face: { fontSize: 26 },
})
