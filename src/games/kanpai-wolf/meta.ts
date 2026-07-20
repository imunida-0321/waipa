import type { GameMeta } from '../types'
import { KanpaiWolfGame } from './kanpai-wolf-game'

export const meta: GameMeta = {
	id: 'kanpai-wolf',
	title: '乾杯ウルフ',
	tagline: 'お題は推理で、\n乾杯はルールで！',
	emoji: '🍻',
	gradient: ['#6C5CE7', '#4834D4'],
	minPlayers: 3,
	maxPlayers: 12,
	requiresPlayers: true,
	premium: true,
	catchCopy: '1人だけ違うお題を見抜け！\nただし今夜は「乾杯ルール」つき！',
	summary:
		'このゲームは、1人だけ微妙に違うお題を持つ「ウルフ」を会話で探す推理ゲームです！さらに毎ラウンド1つだけ「乾杯ルール」（例: 誰かが質問されたら全員乾杯）が公開され、議論中に条件が起きたらみんなで乾杯！ウルフは吊られても市民のお題を当てれば逆転勝ちです！',
	thumbnail: require('@/assets/images/kanpai-wolf/intro.jpg'),
	cardThumbnail: require('@/assets/images/kanpai-wolf/card.jpg'),
	howToPlay: [
		'① メンバーを登録（3〜12名）して、議論時間とお題パックを選ぼう！',
		'② スマホを回して自分のお題をこっそり確認。最後に「今回の乾杯ルール」が発表！',
		'③ 議論タイム！乾杯ルールの条件が起きたら🍻乾杯！しながらウルフを探そう',
		'④ 投票で最多票の正体を発表！ウルフなら市民の勝ち。ウルフがお題を当てたら逆転勝ち！',
	],
	Component: KanpaiWolfGame,
}
