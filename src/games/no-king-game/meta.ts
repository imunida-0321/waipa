import type { GameMeta } from '../types'
import { NoKingGame } from './no-king-game'

export const meta: GameMeta = {
	id: 'no-king-game',
	title: '王様のいない王様ゲーム',
	tagline: 'お題も実行役もランダム！',
	emoji: '👑',
	gradient: ['#F1C40F', '#B7791F'],
	minPlayers: 3,
	maxPlayers: 12,
	catchCopy: 'お題も実行役もランダムに決定！\n王様がいないから、誰も文句なし！',
	summary:
		'このゲームは、全員に秘密の番号を配り、お題と「実行する番号」をランダムに発表する王様ゲーム風パーティーゲームです！王様がいないので、誰も文句は言えません！',
	thumbnail: require('@/assets/images/no-king-game/intro.jpg'),
	cardThumbnail: require('@/assets/images/no-king-game/card.jpg'),
	howToPlay: [
		'① 人数を選んで「番号を配る」！スマホを回して各自こっそり番号を確認（長押しで表示）',
		'② お題が発表されたら「運命のボタン」をタップ！',
		'③ ドラムロールのあと実行役の番号がドン！と発表',
		'④ その番号の人は名乗り出てお題を実行！次のラウンドは番号を配り直してドキドキ継続',
	],
	Component: NoKingGame,
}
