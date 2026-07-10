import { router } from 'expo-router'
import { useEffect, useReducer } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { useTopics } from '@/lib/topics-store'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { CardGrid } from './card-grid'
import { PlayerRoulette } from './player-roulette'
import { PunishReveal } from './punish-reveal'
import { ResultScreen } from './result-screen'
import { initialState, isMismatchShown, reduce } from './reducer'
import { pickBatsuTopic } from './topics'

export const MISMATCH_MS = 1500

export function ReactionPairsGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const topics = useTopics()
	const [state, dispatch] = useReducer(reduce, players.count, (count) =>
		initialState(count, Math.random),
	)

	const mismatch = isMismatchShown(state)
	useEffect(() => {
		if (!mismatch) return
		const t = setTimeout(() => dispatch({ type: 'hideMismatch' }), MISMATCH_MS)
		return () => clearTimeout(t)
	}, [mismatch])

	const turnColor = playerColor(state.turnIndex).value

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={[styles.turnDot, { backgroundColor: turnColor }]} />
				<Text style={styles.turnText}>{names[state.turnIndex]}さんの番</Text>
				{state.passHolder !== null && (
					<Text style={styles.passBadge}>🍀 {names[state.passHolder]}</Text>
				)}
			</View>

			<CardGrid
				cards={state.cards}
				disabled={state.phase !== 'play' || state.flippedIds.length === 2}
				onFlip={(cardId) => dispatch({ type: 'flip', cardId, rng: Math.random })}
			/>

			{state.phase === 'roulette' && state.roulette && (
				<PlayerRoulette
					names={names}
					firstIndex={state.roulette.firstIndex}
					finalIndex={state.roulette.finalIndex}
					passConsumed={state.roulette.passConsumed}
					onDone={() =>
						dispatch({
							type: 'rouletteDone',
							topic: pickBatsuTopic(topics.topics, state.usedTopicIds, Math.random),
						})
					}
				/>
			)}

			{state.phase === 'punish' && state.punish && (
				<PunishReveal
					playerName={names[state.punish.playerIndex]}
					playerIndex={state.punish.playerIndex}
					topicText={state.punish.topic.text}
					onDone={() => dispatch({ type: 'punishDone' })}
				/>
			)}

			{state.phase === 'result' && (
				<ResultScreen
					names={names}
					scores={state.scores}
					punishCounts={state.punishCounts}
					loserIndex={state.loserIndex}
					onRetry={() => dispatch({ type: 'retry', rng: Math.random })}
					onHome={() => router.replace('/')}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md, gap: spacing.md },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	turnDot: { width: 12, height: 12, borderRadius: 6 },
	turnText: { ...typography.title, flex: 1 },
	passBadge: { ...typography.caption, color: colors.gold },
})
