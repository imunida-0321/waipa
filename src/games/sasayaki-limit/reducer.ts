import {
	ROUNDS,
	SUDDEN_DEATH_ZONE_WIDTH,
	judge,
	makeZone,
	tallyLosers,
	zoneWidthForRound,
	type Judgement,
	type Rng,
	type Zone,
} from './engine'

export type Phase =
	'speech' | 'measuring' | 'judged' | 'round-result' | 'sudden-death-intro' | 'result'

export type GameState = {
	phase: Phase
	playerCount: number
	round: number
	turnPos: number
	// 発声順のプレイヤー index。通常は全員、サドンデス中は対象者のみ
	activePlayers: number[]
	zone: Zone
	successCounts: number[]
	lastJudgement: Judgement | null
	lastPeak: number | null
	suddenDeath: boolean
	// 現在のサドンデス周回で失敗したプレイヤー index
	sdFailed: number[]
	losers: number[]
}

export type Action =
	| { type: 'startMeasure' }
	| { type: 'measured'; peakNorm: number }
	| { type: 'next'; rng: Rng }
	| { type: 'nextRound'; rng: Rng }
	| { type: 'sdStart' }
	| { type: 'retry'; rng: Rng }

export function initialState(playerCount: number, rng: Rng): GameState {
	return {
		phase: 'speech',
		playerCount,
		round: 1,
		turnPos: 0,
		activePlayers: Array.from({ length: playerCount }, (_, i) => i),
		zone: makeZone(zoneWidthForRound(1), rng),
		successCounts: Array(playerCount).fill(0),
		lastJudgement: null,
		lastPeak: null,
		suddenDeath: false,
		sdFailed: [],
		losers: [],
	}
}

function toSuddenDeathIntro(state: GameState, members: number[], rng: Rng): GameState {
	return {
		...state,
		phase: 'sudden-death-intro',
		suddenDeath: true,
		activePlayers: members,
		turnPos: 0,
		zone: makeZone(SUDDEN_DEATH_ZONE_WIDTH, rng),
		sdFailed: [],
		lastJudgement: null,
		lastPeak: null,
	}
}

export function reduce(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'startMeasure': {
			if (state.phase !== 'speech') return state
			return { ...state, phase: 'measuring', lastJudgement: null, lastPeak: null }
		}
		case 'measured': {
			if (state.phase !== 'measuring') return state
			const player = state.activePlayers[state.turnPos]
			const judgement = judge(action.peakNorm, state.zone)
			const successCounts = [...state.successCounts]
			let sdFailed = state.sdFailed
			if (state.suddenDeath) {
				if (judgement !== 'ok') sdFailed = [...sdFailed, player]
			} else if (judgement === 'ok') {
				successCounts[player] += 1
			}
			return {
				...state,
				phase: 'judged',
				lastJudgement: judgement,
				lastPeak: action.peakNorm,
				successCounts,
				sdFailed,
			}
		}
		case 'next': {
			if (state.phase !== 'judged') return state
			// まだ発声していない人がいる
			if (state.turnPos + 1 < state.activePlayers.length) {
				return {
					...state,
					phase: 'speech',
					turnPos: state.turnPos + 1,
					lastJudgement: null,
					lastPeak: null,
				}
			}
			// サドンデス周回の決着判定
			if (state.suddenDeath) {
				if (state.sdFailed.length === 1) {
					return { ...state, phase: 'result', losers: state.sdFailed }
				}
				// 全員成功 → 同メンバーで再戦 / 複数失敗 → 失敗者だけで反復
				const members = state.sdFailed.length === 0 ? state.activePlayers : state.sdFailed
				return toSuddenDeathIntro(state, members, action.rng)
			}
			// 通常ラウンド終了
			if (state.round < ROUNDS) {
				return { ...state, phase: 'round-result' }
			}
			// 最終ラウンド終了 → 集計
			const tied = tallyLosers(state.successCounts)
			if (tied.length === 1) {
				return { ...state, phase: 'result', losers: tied }
			}
			return toSuddenDeathIntro(state, tied, action.rng)
		}
		case 'nextRound': {
			if (state.phase !== 'round-result') return state
			const round = state.round + 1
			return {
				...state,
				phase: 'speech',
				round,
				turnPos: 0,
				zone: makeZone(zoneWidthForRound(round), action.rng),
				lastJudgement: null,
				lastPeak: null,
			}
		}
		case 'sdStart': {
			if (state.phase !== 'sudden-death-intro') return state
			return { ...state, phase: 'speech' }
		}
		case 'retry': {
			if (state.phase !== 'result') return state
			return initialState(state.playerCount, action.rng)
		}
	}
}
