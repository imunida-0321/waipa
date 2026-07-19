import { useCallback, useEffect, useLayoutEffect, useReducer } from 'react'
import { packUnlockStore, usePackUnlocked } from '@/lib/pack-unlock-store'
import { getTopicsByPack, topicsStore, useTopics } from '@/lib/topics-store'
import { CountSelect } from './count-select'
import { DealPass } from './deal-pass'
import { KING_PREMIUM_PACK, type Rng } from './engine'
import { initialState, reduce } from './reducer'
import { TopicReveal } from './topic-reveal'

// 呼び出しの都度 Math.random を引く（テストの spyOn を効かせるため。kimagure-ox と同じ理由）
const rng: Rng = () => Math.random()

export function NoKingGame() {
	const [state, dispatch] = useReducer(reduce, undefined, initialState)
	const { topics } = useTopics()
	const premiumUnlocked = usePackUnlocked(KING_PREMIUM_PACK)
	const kingTopics = topics.filter(
		(t) => t.pack === 'king' || (premiumUnlocked && t.pack === KING_PREMIUM_PACK),
	)

	const onRevealDone = useCallback(() => dispatch({ type: 'revealDone' }), [])

	useEffect(() => {
		if (premiumUnlocked && getTopicsByPack(KING_PREMIUM_PACK).length === 0) {
			topicsStore.refreshPremiumPack(KING_PREMIUM_PACK)
		}
	}, [premiumUnlocked])

	// セッション解放は「王様ゲームから出るまで」。アンマウントで再ロック（issue #6）
	useLayoutEffect(() => () => packUnlockStore.lock(KING_PREMIUM_PACK), [])

	if (state.phase === 'count') {
		return (
			<CountSelect
				count={state.playerCount}
				onChangeCount={(count) => dispatch({ type: 'setCount', count })}
				onDeal={() => dispatch({ type: 'deal', rng })}
			/>
		)
	}

	if (state.phase === 'deal') {
		return (
			<DealPass
				round={state.round}
				dealIndex={state.dealIndex}
				playerCount={state.playerCount}
				number={state.numbers[state.dealIndex]}
				onConfirm={() => dispatch({ type: 'confirmNumber', topics: kingTopics, rng })}
			/>
		)
	}

	return (
		<TopicReveal
			phase={state.phase}
			round={state.round}
			topicText={state.topicText}
			executorNumber={state.executorNumber}
			skipsLeft={state.skipsLeft}
			onSkip={() => dispatch({ type: 'skip', topics: kingTopics, rng })}
			onRevealDone={onRevealDone}
			onNextRound={() => dispatch({ type: 'nextRound', rng })}
		/>
	)
}
