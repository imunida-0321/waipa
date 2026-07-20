import type { GameMeta } from '../types'
import { DautDiceGame } from './daut-dice-game'

export const meta: GameMeta = {
	id: 'daut-dice',
	title: 'ダウトダイス',
	tagline: '嘘か本当か？\nサイコロ宣言ブラフ勝負',
	emoji: '🎲',
	gradient: ['#EE5253', '#B33939'],
	minPlayers: 3,
	maxPlayers: 8,
	requiresPlayers: true,
	premium: true,
	catchCopy: 'こっそり振って、出目を宣言。\n嘘を見抜くか、信じて上回るか！',
	summary:
		'このゲームは、2つのサイコロをこっそり振って出目を宣言するブラフゲームです！宣言は直前より強い役だけ。実際の出目と違ってもOK＝ブラフ！次の人は「ダウト」か「信じて振る」かを選び、ダウトの結果でライフが減ります。ライフが尽きた人の負け！',
	howToPlay: [
		'① メンバーを登録（3〜8名）。全員ライフ3でスタート！',
		'② 自分の番: シェイク（かタップ）で振って、長押しでこっそり出目を確認',
		'③ 直前より強い役を宣言してスマホを次の人へ（嘘OK！）。役の強さは 21（ミエ）＞ゾロ目＞通常の目',
		'④ 受けた人は「ダウト！」か「信じて振る」。ダウトで嘘なら宣言者、本当ならダウトした人がライフ-1。ライフ0で負け！',
	],
	Component: DautDiceGame,
}
