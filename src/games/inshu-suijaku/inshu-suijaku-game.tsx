import { router } from 'expo-router'
import { useEffect, useReducer } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playerColor } from '@/theme/player-colors'
import { spacing, typography } from '@/theme/tokens'
import { CardGrid, MATCH_ANIM_MS } from './card-grid'
import { BOARD_CONFIG, remainingPairs, type Rng } from './engine'
import { initialState, isMismatchShown, reduce } from './reducer'
import { PunishReveal } from './punish-reveal'
import { ResultScreen } from './result-screen'
import { SizeSelect } from './size-select'

export const MISMATCH_MS = 1500
export const JOKER_ANIM_MS = 600

const rng: Rng = () => Math.random()

export function InshuSuijakuGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, initialState)

	// 不成立の2枚は約1.5秒見せて自動で裏返す
	const mismatch = isMismatchShown(state)
	useEffect(() => {
		if (!mismatch) return
		const t = setTimeout(() => dispatch({ type: 'hideMismatch' }), MISMATCH_MS)
		return () => clearTimeout(t)
	}, [mismatch, state.flippedIds])

	// 成立クロスフェード（約1秒）→ punish オーバーレイ
	useEffect(() => {
		if (state.phase !== 'matchAnim') return
		haptics.success()
		const t = setTimeout(() => dispatch({ type: 'matchAnimDone' }), MATCH_ANIM_MS)
		return () => clearTimeout(t)
	}, [state.phase])

	// ジョーカーの短いリビール演出（約0.6秒）→ punish オーバーレイ
	useEffect(() => {
		if (state.phase !== 'jokerAnim') return
		haptics.heavy()
		const t = setTimeout(() => dispatch({ type: 'jokerAnimDone' }), JOKER_ANIM_MS)
		return () => clearTimeout(t)
	}, [state.phase])

	if (state.phase === 'size') {
		return (
			<SizeSelect onStart={(size) => dispatch({ type: 'start', size, rng })} />
		)
	}

	if (state.phase === 'result') {
		return (
			<ResultScreen
				names={names}
				scores={state.scores}
				onRetry={() => dispatch({ type: 'retry', rng })}
				onHome={() => router.replace('/')}
			/>
		)
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View
					style={[
						styles.turnDot,
						{ backgroundColor: playerColor(state.turnIndex).value },
					]}
				/>
				<Text style={styles.turn}>{names[state.turnIndex]}さんの番</Text>
				<Text style={styles.remain}>残り{remainingPairs(state.cards)}ペア</Text>
			</View>

			<CardGrid
				cards={state.cards}
				columns={BOARD_CONFIG[state.size].columns}
				matchAnimIds={state.phase === 'matchAnim' ? state.flippedIds : []}
				onFlip={(cardId) => dispatch({ type: 'flip', cardId })}
				disabled={state.phase !== 'play' || mismatch}
			/>

			{state.phase === 'punish' && state.punish && (
				<PunishReveal
					punish={state.punish}
					playerName={names[state.punish.playerIndex]}
					playerIndex={state.punish.playerIndex}
					onDone={() => dispatch({ type: 'punishDone' })}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md, gap: spacing.md },
	header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
	turnDot: { width: 10, height: 10, borderRadius: 5 },
	turn: { ...typography.title, flex: 1 },
	remain: { ...typography.caption },
})
