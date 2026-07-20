import type { GameMeta } from '../types'
import { BombSwipeGame } from './bomb-swipe-game'

export const meta: GameMeta = {
	id: 'bomb-swipe',
	title: '爆弾スワイプ',
	tagline: 'どこまで攻める？\n踏んだら即アウト！',
	emoji: '🧨',
	gradient: ['#FF4D4F', '#7B1E1E'],
	minPlayers: 2,
	maxPlayers: 12,
	requiresPlayers: true,
	premium: true,
	catchCopy: '攻めるほど高得点、でも地雷を踏んだら爆発！\nビビって低スコアでも負け！',
	summary:
		'このゲームは、ゲージを上にスワイプして離した位置がスコアになる度胸試しです！60〜95のどこかに隠された地雷を踏むと爆発して負け。爆発者がいなければ一番スコアが低い人が負けになります！',
	howToPlay: [
		'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
		'② 自分の番が来たら、ゲージを下から上へスワイプ！',
		'③ 指を離した位置がスコア（0〜100）。ただし地雷（60〜95のどこか）を踏むと爆発！',
		'④ 爆発した人が負け！誰も爆発しなかったら最低スコアの人が負け！',
	],
	Component: BombSwipeGame,
}
