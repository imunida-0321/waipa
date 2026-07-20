import type { GameMeta } from '../types'
import { SasayakiLimitGame } from './sasayaki-limit-game'

export const meta: GameMeta = {
	id: 'sasayaki-limit',
	title: 'ささやきリミット',
	tagline: '緑ゾーンの声量で\nお題を言い切れ！',
	emoji: '🤫',
	gradient: ['#3DDC84', '#0FA3B1'],
	minPlayers: 2,
	maxPlayers: 12,
	requiresPlayers: true,
	premium: true,
	catchCopy: '大きすぎても小さすぎてもアウト！\nお題セリフを「ちょうどいい声」で言い切れ！',
	summary:
		'このゲームは、マイクの音量メーターを見ながらお題セリフを「緑ゾーン内の音量」で言い切るゲームです！ラウンドが進むと緑ゾーンはどんどん狭くなり、3ラウンド合計の成功数が最少の人が負け。録音は保存されないので安心です！',
	howToPlay: [
		'① メンバーを登録（2〜12名）して、まわりの音を3秒はかろう！（マイク許可が必要）',
		'② 自分の番が来たらタップ！3秒以内にお題セリフを発声！',
		'③ 声の大きさ（ピーク）が緑ゾーン内なら成功。大きすぎても小さすぎても失敗！',
		'④ ラウンドごとにゾーンが狭くなる全3ラウンド。成功数最少の人が負け！（同率はサドンデス）',
	],
	Component: SasayakiLimitGame,
}
