import type { GameMeta } from '../types'
import { BombGame } from './bomb-game'

export const meta: GameMeta = {
	id: 'bomb-2-16',
	title: 'BOMB!! 2/16',
	tagline: '16個のボタンにハズレが2個！',
	emoji: '💣',
	gradient: ['#FF6B6B', '#C0392B'],
	minPlayers: 2,
	maxPlayers: 12,
	catchCopy: '16個のボタンにハズレが2つ！\n勝敗は完全運ゲームで決まる！',
	summary:
		'このゲームは、16個のボタンから1つを選ぶだけ！中には「全員アウト」と「あなただけアウト」の2つのハズレが潜んでいる、完全運ゲーです！',
	thumbnail: require('@/assets/images/bomb/intro.jpg'),
	cardThumbnail: require('@/assets/images/bomb/card.jpg'),
	howToPlay: [
		'① 16個のボタンのどこかに爆弾が2個…（💣1人負け ＋ 💥全員負け）',
		'② スマホを回して、1人1個ずつタップ！セーフなら次の人へ',
		'③ 爆弾を引いた瞬間ゲーム終了！💣なら引いた人だけ負け、💥なら全員負け！',
		'④ 開けるほど爆弾の確率アップ。どこまで攻める？',
	],
	Component: BombGame,
}
