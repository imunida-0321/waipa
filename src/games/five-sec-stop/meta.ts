import type { GameMeta } from '../types'
import { FiveSecStopGame } from './five-sec-stop-game'

export const meta: GameMeta = {
	id: 'five-sec-stop',
	title: '5秒STOP',
	tagline: '5秒ぴったりで止めろ！',
	emoji: '⏱️',
	gradient: ['#4ECDC4', '#2C7A7B'],
	minPlayers: 2,
	maxPlayers: 12,
	requiresPlayers: true,
	catchCopy: '5.00秒ぴったりを狙ってストップ！\nでも途中から数字は見えない…！',
	summary:
		'このゲームは、タイマーを5.00秒ぴったりを狙って止めるゲームです！3秒をすぎると数字が見えなくなるので、最後は自分の体内時計だけが頼り。5.00秒から一番遠かった人が負けです！',
	thumbnail: require('@/assets/images/five-sec-stop/intro.jpg'),
	cardThumbnail: require('@/assets/images/five-sec-stop/card.jpg'),
	howToPlay: [
		'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
		'② 自分の番が来たらタップでスタート！5.00秒ぴったりを狙ってもう一度タップ！',
		'③ 3秒をすぎると数字が見えなくなる！感覚だけが頼り！',
		'④ 全員の記録を発表！5.00秒から一番遠かった人が負け！（±0.05秒は「ぴったり賞」）',
	],
	Component: FiveSecStopGame,
}
