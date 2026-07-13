import { router } from 'expo-router'
import { useReducer } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playerColor } from '@/theme/player-colors'
import { spacing, typography } from '@/theme/tokens'
import { DeclareScreen } from './declare-screen'
import { ForeheadScreen } from './forehead-screen'
import { initialState, reduce } from './reducer'
import { ResultScreen } from './result-screen'

export function OdekoPokerGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, initialState)

	return (
		<View style={styles.container}>
			{state.phase === 'deal' && (
				<View style={styles.body}>
					<Text style={styles.title}>ラウンド {state.round}</Text>
					<Text style={styles.hint}>
						1〜13のカードを1枚ずつ配ります{'\n'}
						自分のカードだけは見ちゃダメ！
					</Text>
					<GradientButton
						title="カードを配る"
						onPress={() => dispatch({ type: 'start', rng: Math.random })}
					/>
				</View>
			)}

			{state.phase === 'forehead' && (
				<ForeheadScreen
					key={state.turnIndex}
					playerName={names[state.turnIndex]}
					playerColor={playerColor(state.turnIndex).value}
					card={state.cards[state.turnIndex]}
					onDone={() => dispatch({ type: 'foreheadDone' })}
				/>
			)}

			{state.phase === 'declare' && (
				<DeclareScreen
					key={state.turnIndex}
					playerName={names[state.turnIndex]}
					onDeclare={(choice) => dispatch({ type: 'declare', choice })}
				/>
			)}

			{state.phase === 'result' && state.judgement && (
				<ResultScreen
					names={names}
					cards={state.cards}
					declarations={state.declarations}
					judgement={state.judgement}
					onNextRound={() => dispatch({ type: 'nextRound' })}
					onHome={() => router.replace('/')}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md },
	body: { flex: 1, justifyContent: 'center', gap: spacing.lg },
	title: { ...typography.hero, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center', lineHeight: 20 },
})
