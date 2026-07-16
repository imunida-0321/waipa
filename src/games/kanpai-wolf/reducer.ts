import {
	assignRoles,
	judgeResult,
	swapWords,
	tallyVotes,
	type AssignedWords,
	type KanpaiTrigger,
	type Rng,
	type WordPair,
} from './engine'

export type Phase =
	'setup'
	| 'deal'
	| 'trigger-reveal'
	| 'discuss'
	| 'vote'
	| 'runoff-discuss'
	| 'reveal'
	| 'reversal'
	| 'result'

export type Outcome = 'citizens' | 'wolf' | 'wolf-reversal'

export type StartConfig = {
	wolfCount: 1 | 2
	discussSeconds: 60 | 180 | 300
	pack: string
}

export type GameState = {
	phase: Phase
	playerCount: number
	wolfCount: 1 | 2
	discussSeconds: 60 | 180 | 300
	pack: string
	words: AssignedWords | null
	wolfIndices: number[] // 誰にも表示しない内部状態
	dealIndex: number
	votes: (number | null)[]
	voteCandidates: number[] | null // 決選投票の候補。null は通常投票
	voterQueue: number[]
	voteTurn: number
	eliminatedIndex: number | null
	outcome: Outcome | null
	usedPairIds: string[] // 連戦の重複出題防止
	trigger: KanpaiTrigger | null // 今ラウンドの公開「乾杯ルール」
	kanpaiCount: number // 今ラウンドの乾杯回数（演出用・勝敗に影響しない）
	usedTriggerIds: string[] // 連戦の重複回避
}

export type Action =
	| { type: 'start'; config: StartConfig; pair: WordPair; trigger: KanpaiTrigger; rng: Rng }
	| { type: 'dealtOne' }
	| { type: 'triggerRevealDone' }
	| { type: 'discussDone' }
	| { type: 'vote'; target: number }
	| { type: 'revealDone' }
	| { type: 'reversalJudged'; guessed: boolean }
	| { type: 'retry'; pair: WordPair; trigger: KanpaiTrigger; rng: Rng }

export function initialState(playerCount: number): GameState {
	return {
		phase: 'setup',
		playerCount,
		wolfCount: 1,
		discussSeconds: 180,
		pack: 'food',
		words: null,
		wolfIndices: [],
		dealIndex: 0,
		votes: [],
		voteCandidates: null,
		voterQueue: [],
		voteTurn: 0,
		eliminatedIndex: null,
		outcome: null,
		usedPairIds: [],
		trigger: null,
		kanpaiCount: 0,
		usedTriggerIds: [],
	}
}

export function currentVoter(state: GameState): number | null {
	if (state.phase !== 'vote') return null
	return state.voterQueue[state.voteTurn] ?? null
}

// 新ラウンド（start / retry）の共通処理
function newRound(state: GameState, pair: WordPair, trigger: KanpaiTrigger, rng: Rng): GameState {
	// choosePair / chooseTrigger が used をリセットして返したものは既にリストにある → 作り直す
	const usedPairIds = state.usedPairIds.includes(pair.id)
		? [pair.id]
		: [...state.usedPairIds, pair.id]
	const usedTriggerIds = state.usedTriggerIds.includes(trigger.id)
		? [trigger.id]
		: [...state.usedTriggerIds, trigger.id]
	return {
		...state,
		words: swapWords(pair, rng),
		wolfIndices: assignRoles(state.playerCount, state.wolfCount, rng),
		dealIndex: 0,
		votes: [],
		voteCandidates: null,
		voterQueue: [],
		voteTurn: 0,
		eliminatedIndex: null,
		outcome: null,
		usedPairIds,
		trigger,
		kanpaiCount: 0,
		usedTriggerIds,
		phase: 'deal',
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'start': {
			if (state.phase !== 'setup') return state
			// ウルフ2人は7人以上のみ（それ未満は1に丸める）
			const wolfCount = action.config.wolfCount === 2 && state.playerCount >= 7 ? 2 : 1
			return newRound(
				{
					...state,
					wolfCount,
					discussSeconds: action.config.discussSeconds,
					pack: action.config.pack,
				},
				action.pair,
				action.trigger,
				action.rng,
			)
		}
		case 'dealtOne':
			if (state.phase !== 'deal') return state
			if (state.dealIndex + 1 < state.playerCount)
				return { ...state, dealIndex: state.dealIndex + 1 }
			return { ...state, phase: 'trigger-reveal' }
		case 'triggerRevealDone':
			if (state.phase !== 'trigger-reveal') return state
			return { ...state, phase: 'discuss' }
		case 'discussDone': {
			if (state.phase !== 'discuss' && state.phase !== 'runoff-discuss') return state
			const all = Array.from({ length: state.playerCount }, (_, i) => i)
			const voterQueue =
				state.voteCandidates === null
					? all
					: all.filter((i) => !state.voteCandidates?.includes(i))
			return {
				...state,
				votes: Array(state.playerCount).fill(null),
				voterQueue,
				voteTurn: 0,
				phase: 'vote',
			}
		}
		case 'vote': {
			if (state.phase !== 'vote') return state
			const voter = state.voterQueue[state.voteTurn]
			if (voter === undefined) return state
			if (action.target === voter) return state
			if (action.target < 0 || action.target >= state.playerCount) return state
			if (state.voteCandidates !== null && !state.voteCandidates.includes(action.target))
				return state
			const votes = [...state.votes]
			votes[voter] = action.target
			if (state.voteTurn + 1 < state.voterQueue.length)
				return { ...state, votes, voteTurn: state.voteTurn + 1 }
			// 最後の1票で即開票
			const top = tallyVotes(votes)
			if (top.length === 1)
				return { ...state, votes, eliminatedIndex: top[0], phase: 'reveal' }
			if (state.voteCandidates === null) {
				// 通常投票の同票
				if (top.length === state.playerCount)
					// 全員同票: 決選が成立しない → 再議論して通常投票をやり直す
					return { ...state, votes, voteCandidates: null, phase: 'runoff-discuss' }
				// 即・決選投票（候補＝同票トップ、投票者＝候補以外の全員）
				const all = Array.from({ length: state.playerCount }, (_, i) => i)
				return {
					...state,
					votes: Array(state.playerCount).fill(null),
					voteCandidates: top,
					voterQueue: all.filter((i) => !top.includes(i)),
					voteTurn: 0,
					phase: 'vote',
				}
			}
			// 決選投票でも同票 → 再議論を挟んで決着まで繰り返す
			return { ...state, votes, voteCandidates: top, phase: 'runoff-discuss' }
		}
		case 'revealDone': {
			if (state.phase !== 'reveal' || state.eliminatedIndex === null) return state
			if (judgeResult(state.eliminatedIndex, state.wolfIndices) === 'citizens')
				return { ...state, phase: 'reversal' }
			return { ...state, outcome: 'wolf', phase: 'result' }
		}
		case 'reversalJudged':
			if (state.phase !== 'reversal') return state
			return {
				...state,
				outcome: action.guessed ? 'wolf-reversal' : 'citizens',
				phase: 'result',
			}
		case 'retry':
			if (state.phase !== 'result') return state
			return newRound(state, action.pair, action.trigger, action.rng)
	}
}
