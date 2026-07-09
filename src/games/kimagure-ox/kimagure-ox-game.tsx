import { useEffect, useReducer } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ResultOverlay } from '@/components/game/result-overlay'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, spacing, typography } from '@/theme/tokens'
import type { Mark } from './engine'
import { BoardView } from './board'
import { EventCutin } from './event-cutin'
import type { Rng } from './events'
import { initialState, reduce } from './reducer'
import { KOX } from './theme'

// Math.random を参照ではなく呼び出し時に評価する。`const rng = Math.random` だと
// モジュール読み込み時点の関数参照を固定してしまい、テストの jest.spyOn(Math, 'random')
// による差し替えが効かなくなる（呼び出しの都度 Math.random を引くことで回避する）
const rng: Rng = () => Math.random()

const markText = (m: Mark) => (m === 'o' ? '◯' : '×')
const markColor = (m: Mark) => (m === 'o' ? KOX.o : KOX.x)

export function KimagureOxGame() {
	const [state, dispatch] = useReducer(reduce, rng, initialState)

	useEffect(() => {
		if (state.phase === 'finished') haptics.success()
	}, [state.phase])

	// Text のネストは RNTL のテキストマッチが不安定になるため、1行=1ノードで描画する
	if (state.phase === 'intro') {
		return (
			<View style={styles.intro}>
				<Text style={styles.introLabel}>コイントスの結果…</Text>
				<Text style={[styles.introTurn, { color: markColor(state.turn) }]}>
					先手は {markText(state.turn)}！
				</Text>
				<GradientButton title="スタート" onPress={() => dispatch({ type: 'start' })} />
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<View style={styles.turnRow}>
				<Text style={[styles.turnText, { color: markColor(state.turn) }]}>
					{markText(state.turn)} の番
				</Text>
				{state.extraMoves > 0 && <Text style={styles.extraBadge}>⚡ ダブル手番中</Text>}
			</View>

			<BoardView
				board={state.board}
				blocked={state.blocked}
				disabled={state.phase !== 'playing'}
				onCellPress={(index) => {
					haptics.tap()
					dispatch({ type: 'tap', index, rng })
				}}
			/>

			{state.phase === 'cutin' && state.pendingEvent && (
				<EventCutin
					event={state.pendingEvent}
					onDone={() => dispatch({ type: 'cutinDone', rng })}
				/>
			)}

			<ResultOverlay
				visible={state.phase === 'finished'}
				onRetry={() => dispatch({ type: 'retry', rng })}
				onHome={() => router.replace('/')}
			>
				<View style={styles.resultContent}>
					<Text style={styles.resultEmoji}>{state.winner === 'draw' ? '🤝' : '🎉'}</Text>
					{state.winner === 'draw' ? (
						<Text style={styles.resultText}>引き分け</Text>
					) : (
						state.winner && (
							<Text style={[styles.resultText, { color: markColor(state.winner) }]}>
								{markText(state.winner)} の勝ち！
							</Text>
						)
					)}
				</View>
			</ResultOverlay>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', gap: spacing.lg },
	intro: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.lg,
		padding: spacing.lg,
	},
	introLabel: { ...typography.caption },
	introTurn: { ...typography.hero },
	turnRow: { alignItems: 'center', gap: spacing.xs },
	turnText: { ...typography.title },
	extraBadge: { ...typography.caption, color: colors.gold },
	resultContent: { alignItems: 'center', gap: spacing.md },
	resultEmoji: { fontSize: 72 },
	resultText: { ...typography.hero },
})
