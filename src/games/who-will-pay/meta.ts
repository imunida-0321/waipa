import type { GameMeta } from '../types'
import { WhoWillPayGame } from './who-will-pay-game'

export const meta: GameMeta = {
	id: 'who-will-pay',
	title: 'Who will pay',
	tagline: '会計はルーレットで決めよう！',
	emoji: '💸',
	gradient: ['#E85BF7', '#7B5CFA'],
	minPlayers: 2,
	maxPlayers: 8,
	requiresPlayers: true,
	catchCopy: 'お会計の金額を一桁ずつルーレットで回し、\n誰が支払うかを決定します！',
	summary:
		'このゲームは、合計金額の各桁（千の位、百の位、十の位、一の位）を1桁ずつルーレットで決定し、その桁の金額を誰が支払うかをランダムに決めるゲームです！',
	thumbnail: require('@/assets/images/who-will-pay/intro.jpg'),
	cardThumbnail: require('@/assets/images/who-will-pay/card.jpg'),
	howToPlay: [
		'① 一緒に遊ぶメンバーを登録しよう！（2〜8名、各自に色がつきます）',
		'② お会計の合計金額を入力しよう！',
		'③ 「GO!」で桁ごとにルーレットを回そう！（点滅中の桁が対象）',
		'④ 各桁の色と名前の人が、その桁の金額を支払おう！',
	],
	Component: WhoWillPayGame,
}
