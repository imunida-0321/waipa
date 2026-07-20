import type { GameMeta } from '../types'
import { OdekoPokerGame } from './odeko-poker-game'

export const meta: GameMeta = {
	id: 'odeko-poker',
	title: 'おでこインディアンポーカー',
	tagline: '自分だけ見えない\nカードで勝負！',
	emoji: '🎴',
	gradient: ['#F368E0', '#8854D0'],
	minPlayers: 3,
	maxPlayers: 12,
	requiresPlayers: true,
	premium: true,
	catchCopy: '額に当てたカードは自分だけ見えない！\nみんなの反応で勝負か降りるか決めろ！',
	summary:
		'このゲームは、スマホを額に当てて「自分だけ見えないカード」を掲げるインディアンポーカーです！他人の反応だけを頼りに「勝負」か「降りる」かをこっそり宣言。勝負した中で最弱カードの人が負け、最強カードなのに降りたら「ヘタレ賞」で一緒に飲みます！',
	howToPlay: [
		'① メンバーを登録（3〜12名）して、1〜13のカードを1枚ずつ配ろう！',
		'② 順番にスマホを額に当てて5秒キープ！自分は見えない、みんなは覚えて！',
		'③ みんなの反応を頼りに「勝負」か「降りる」を長押しでこっそり宣言！',
		'④ 全カード公開！勝負した中で最弱の人が負け。最強カードで降りたら「ヘタレ賞」！',
	],
	Component: OdekoPokerGame,
}
