import type { GameMeta } from '../types'
import { ChinchiroGame } from './chinchiro-game'

export const meta: GameMeta = {
	id: 'chinchiro',
	title: 'チンチロ',
	tagline: '丼とサイコロ3つで\n運だめし真剣勝負！',
	emoji: '🎲',
	gradient: ['#FF9F43', '#EE5253'],
	minPlayers: 2,
	maxPlayers: 12,
	requiresPlayers: true,
	catchCopy: 'サイコロ3つを丼に振って役で勝負！\n一番弱かった人が負け！',
	summary:
		'このゲームは、3個のサイコロを振って出た役の強さで勝負するチンチロです！役が出るまで最大3回振れます。ピンゾロ（1・1・1）が最強、ヒフミ（1・2・3）は最弱。丼からサイコロが飛び出す『ションベン』にも注意！',
	thumbnail: require('@/assets/images/chinchiro/intro.jpg'),
	cardThumbnail: require('@/assets/images/chinchiro/card.jpg'),
	howToPlay: [
		'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
		'② 自分の番が来たらタップでサイコロを3つ振ろう！役が出たら確定、役なしなら最大3投まで振り直し！',
		'③ 役の強さは ピンゾロ＞アラシ＞シゴロ＞目＞目なし＞ヒフミ。ションベン（丼から飛び出し）はその投が無効に！',
		'④ 全員の役を発表！一番弱かった人が負け！（同率ならサドンデス勝負！）',
	],
	Component: ChinchiroGame,
}
