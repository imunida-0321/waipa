import { useCallback, useReducer } from 'react'
import { haptics } from '@/lib/haptics'
import { useTopics } from '@/lib/topics-store'
import { CountSelect } from './count-select'
import { DealPass } from './deal-pass'
import type { Rng } from './engine'
import { initialState, reduce } from './reducer'
import { TopicReveal } from './topic-reveal'

// 呼び出しの都度 Math.random を引く（テストの spyOn を効かせるため。kimagure-ox と同じ理由）
const rng: Rng = () => Math.random()

export function NoKingGame() {
	const [state, dispatch] = useReducer(reduce, undefined, initialState)
	const { topics } = useTopics()
	const kingTopics = topics.filter((t) => t.pack === 'king')

	const onRevealDone = useCallback(() => dispatch({ type: 'revealDone' }), [])

	if (state.phase === 'count') {
		return (
			<CountSelect
				count={state.playerCount}
				onChangeCount={(count) => dispatch({ type: 'setCount', count })}
				onDeal={() => {
					haptics.tap()
					dispatch({ type: 'deal', rng })
				}}
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
				onConfirm={() => {
					haptics.tap()
					dispatch({ type: 'confirmNumber', topics: kingTopics, rng })
				}}
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
			onNextRound={() => {
				haptics.tap()
				dispatch({ type: 'nextRound', rng })
			}}
		/>
	)
}
