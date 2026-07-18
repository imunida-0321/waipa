import type { GameMeta } from '../types'
import { BurstChickenGame } from './burst-chicken-game'

export const meta: GameMeta = {
	id: 'burst-chicken',
	title: 'バーストチキン',
	tagline: '積みすぎたら爆発！宣言チキンレース',
	emoji: '🐔',
	gradient: ['#FF9F43', '#EE5253'],
	minPlayers: 2,
	maxPlayers: 12,
	requiresPlayers: true,
	premium: true,
	catchCopy: '秘密の上限を超えたら爆発！\n積むか、ストップか、度胸の勝負！',
	summary:
		'このゲームは、21〜30のどこかに隠された上限に向かって +1/+2/+3 を積み上げるチキンレースです！超えた瞬間に爆発して負け。合計15からは「ストップ宣言」もでき、精算で一番積んでいない人が負けになります！',
	howToPlay: [
		'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
		'② 順番に +1 / +2 / +3 を選んで合計に積もう！',
		'③ 秘密の上限（21〜30のどこか）を超えたら爆発！その人の負け！',
		'④ 合計15からは「ストップ宣言」もアリ。一番積んでいない人が負け！',
	],
	Component: BurstChickenGame,
}
