import type { GameMeta } from '../types'
import { ReactionPairsGame } from './reaction-pairs-game'

export const meta: GameMeta = {
	id: 'reaction-pairs',
	title: 'リアクション神経衰弱',
	tagline: 'ペアが揃ったら罰ゲーム!?',
	emoji: '🃏',
	gradient: ['#26DE81', '#20BF6B'],
	minPlayers: 2,
	maxPlayers: 12,
	requiresPlayers: true,
	catchCopy: 'ペアが揃った瞬間、\n全員ルーレットで罰ゲーム対象者が決定！',
	summary:
		'このゲームは、4×4の神経衰弱です！ペアが揃うたびに全員ルーレットで罰ゲーム対象者を抽選。ジョーカーを引いたら即負け、ラッキー🍀を引けば罰免除パスがもらえます！',
	howToPlay: [
		'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
		'② 順番にカードを2枚めくる神経衰弱！揃っても揃わなくても次の人へ',
		'③ ペアが揃った瞬間、全員ルーレットで罰ゲーム対象者が決定！',
		'④ ジョーカーは即負けで終了、ラッキー🍀は罰免除パス。全ペアそろえてもゴール！',
	],
	Component: ReactionPairsGame,
}
