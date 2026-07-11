import { useReducer } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { LIMIT_MAX, LIMIT_MIN, canStop, createInitialState, reduce } from './engine'
import { tensionLevel } from './tension'
import { BC } from './theme'

// 宣言チキンレース: 秘密の上限（21〜30）に向かって +1/+2/+3 を積み、
// 超えたら爆発。合計15からはストップ宣言→貢献最少が負けの精算もできる
export function BurstChickenGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, (count) =>
		createInitialState(count, Math.random),
	)

	const tension = tensionLevel(state.total)
	const turnColor = playerColor(state.turnIndex).value

	const add = (amount: 1 | 2 | 3) => {
		playSound('tick') // 素材未登録の間は無音スキップ（bomb-relay と同じ扱い）
		if (tension >= 0.5) haptics.heavy()
		else haptics.tap()
		dispatch({ type: 'add', amount })
	}

	const stop = () => {
		haptics.heavy()
		dispatch({ type: 'stop' })
	}

	if (state.phase !== 'playing') {
		// Task 8 でリザルト演出（爆発・精算・答え合わせ）に差し替える
		return (
			<View style={styles.container}>
				<Text style={styles.totalValue}>💥</Text>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<View
				pointerEvents="none"
				testID="tension-mask"
				style={[styles.tensionMask, { opacity: tension * 0.45 }]}
			/>
			<Text style={styles.hint}>
				上限は {LIMIT_MIN}〜{LIMIT_MAX} のどこか…
			</Text>

			<View style={styles.totalBlock}>
				<Text style={styles.totalLabel}>いまの合計</Text>
				<Text style={[styles.totalValue, tension > 0 && styles.totalDanger]}>
					{state.total}
				</Text>
			</View>

			<View style={styles.turnRow}>
				<View style={[styles.turnBar, { backgroundColor: turnColor }]} />
				<Text style={styles.turnText}>{names[state.turnIndex]}さんの番</Text>
			</View>

			<View style={styles.addRow}>
				{([1, 2, 3] as const).map((n) => (
					<Pressable
						key={n}
						accessibilityRole="button"
						accessibilityLabel={`+${n}`}
						onPress={() => add(n)}
						style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
					>
						<Text style={styles.addBtnText}>+{n}</Text>
					</Pressable>
				))}
			</View>

			{canStop(state) && (
				<Pressable
					accessibilityRole="button"
					onPress={stop}
					style={({ pressed }) => [styles.stopBtn, pressed && styles.pressed]}
				>
					<Text style={styles.stopBtnText}>🛑 ストップ宣言！</Text>
				</Pressable>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: spacing.lg,
		gap: spacing.xl,
		justifyContent: 'center',
	},
	tensionMask: {
		...StyleSheet.absoluteFill,
		backgroundColor: BC.maskRed,
	},
	hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
	totalBlock: { alignItems: 'center', gap: spacing.xs },
	totalLabel: { ...typography.caption, color: colors.textMuted },
	totalValue: { fontSize: 72, fontWeight: '800', color: colors.text, textAlign: 'center' },
	totalDanger: { color: BC.red },
	turnRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		alignSelf: 'center',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	turnBar: { width: 4, height: 24, borderRadius: 2 },
	turnText: { ...typography.body, color: colors.text },
	addRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
	addBtn: {
		flex: 1,
		maxWidth: 96,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: BC.orange,
		borderRadius: radii.lg,
		paddingVertical: spacing.md,
		alignItems: 'center',
	},
	addBtnText: { ...typography.title, color: colors.text },
	stopBtn: {
		alignSelf: 'center',
		backgroundColor: BC.red,
		borderRadius: 999,
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.md,
	},
	stopBtnText: { ...typography.body, fontWeight: '800', color: colors.text },
	pressed: { opacity: 0.8 },
})
