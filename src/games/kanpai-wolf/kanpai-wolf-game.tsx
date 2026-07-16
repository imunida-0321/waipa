import { useCallback, useReducer } from 'react'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { getPairsByPack, useWordPairs } from '@/lib/word-pairs-store'
import { DealPass } from './deal-pass'
import { DiscussScreen } from './discuss-screen'
import { choosePair, chooseTrigger } from './engine'
import { currentVoter, initialState, reduce, type StartConfig } from './reducer'
import { ResultScreen } from './result-screen'
import { RevealOverlay } from './reveal-overlay'
import { ReversalScreen } from './reversal-screen'
import { SetupScreen } from './setup-screen'
import { TriggerRevealScreen } from './trigger-reveal-screen'
import { VoteScreen } from './vote-screen'

const RUNOFF_DISCUSS_SECONDS = 60

export function KanpaiWolfGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	useWordPairs() // 配信 refresh 後の再レンダー購読
	const [state, dispatch] = useReducer(reduce, players.count, initialState)

	const pickPair = useCallback(
		(pack: string, usedIds: readonly string[]) =>
			choosePair(getPairsByPack(pack), pack, usedIds, Math.random),
		[],
	)

	const onStart = (config: StartConfig) =>
		dispatch({
			type: 'start',
			config,
			pair: pickPair(config.pack, state.usedPairIds),
			trigger: chooseTrigger(state.usedTriggerIds, Math.random),
			rng: Math.random,
		})

	switch (state.phase) {
		case 'setup':
			return <SetupScreen playerCount={players.count} onStart={onStart} />
		case 'deal': {
			if (!state.words) return null
			const isWolf = state.wolfIndices.includes(state.dealIndex)
			return (
				<DealPass
					key={state.dealIndex}
					dealIndex={state.dealIndex}
					playerCount={state.playerCount}
					name={names[state.dealIndex]}
					word={isWolf ? state.words.wolf : state.words.majority}
					onConfirm={() => dispatch({ type: 'dealtOne' })}
				/>
			)
		}
		case 'trigger-reveal': {
			if (!state.trigger) return null
			return (
				<TriggerRevealScreen
					triggerText={state.trigger.text}
					onDone={() => dispatch({ type: 'triggerRevealDone' })}
				/>
			)
		}
		case 'discuss':
			return (
				<DiscussScreen
					seconds={state.discussSeconds}
					trigger={state.trigger?.text ?? ''}
					kanpaiCount={state.kanpaiCount}
					onKanpai={() => dispatch({ type: 'kanpai' })}
					onDone={() => dispatch({ type: 'discussDone' })}
				/>
			)
		case 'runoff-discuss':
			return (
				<DiscussScreen
					key={`runoff-${state.voteCandidates?.join('-') ?? 'all'}`}
					seconds={RUNOFF_DISCUSS_SECONDS}
					trigger={state.trigger?.text ?? ''}
					kanpaiCount={state.kanpaiCount}
					isRunoff
					onKanpai={() => dispatch({ type: 'kanpai' })}
					onDone={() => dispatch({ type: 'discussDone' })}
				/>
			)
		case 'vote': {
			const voter = currentVoter(state)
			if (voter === null) return null
			return (
				<VoteScreen
					key={`${state.voteCandidates?.join('-') ?? 'all'}-${state.voteTurn}-${voter}`}
					voterIndex={voter}
					voterName={names[voter]}
					names={names}
					candidates={state.voteCandidates}
					onVote={(target) => dispatch({ type: 'vote', target })}
				/>
			)
		}
		case 'reveal': {
			if (state.eliminatedIndex === null) return null
			return (
				<RevealOverlay
					name={names[state.eliminatedIndex]}
					wasWolf={state.wolfIndices.includes(state.eliminatedIndex)}
					onDone={() => dispatch({ type: 'revealDone' })}
				/>
			)
		}
		case 'reversal': {
			if (state.eliminatedIndex === null || !state.words) return null
			return (
				<ReversalScreen
					wolfName={names[state.eliminatedIndex]}
					majorityWord={state.words.majority}
					onJudge={(guessed) => dispatch({ type: 'reversalJudged', guessed })}
				/>
			)
		}
		case 'result': {
			if (state.outcome === null || !state.words) return null
			return (
				<ResultScreen
					outcome={state.outcome}
					wolfNames={state.wolfIndices.map((i) => names[i])}
					words={state.words}
					kanpaiCount={state.kanpaiCount}
					onRetry={() =>
						dispatch({
							type: 'retry',
							pair: pickPair(state.pack, state.usedPairIds),
							trigger: chooseTrigger(state.usedTriggerIds, Math.random),
							rng: Math.random,
						})
					}
				/>
			)
		}
	}
}
