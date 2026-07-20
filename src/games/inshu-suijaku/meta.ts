import type { GameMeta } from '../types'
import { InshuSuijakuGame } from './inshu-suijaku-game'

export const meta: GameMeta = {
	id: 'inshu-suijaku',
	title: '飲酒衰弱',
	tagline: 'ペアを揃えたら\n罰ゲーム発表！',
	emoji: '🍻',
	gradient: ['#FF6B81', '#B33939'],
	minPlayers: 2,
	maxPlayers: 12,
	requiresPlayers: true,
	premium: true,
	catchCopy: 'めくって揃えば罰ゲーム！\n誰にやらせるかは、あなた次第！',
	summary:
		'このゲームは、トランプの神経衰弱に罰ゲームを仕込んだゲームです！ペアを揃えると隠されていた罰ゲームが発表され、揃えた人が実行者を指名。ジョーカーを引いたら特大罰を自分が実行！全ペア消化後、獲得ペア数のランキングを発表します！',
	thumbnail: require('@/assets/images/inshu-suijaku/intro.jpg'),
	cardThumbnail: require('@/assets/images/inshu-suijaku/card.jpg'),
	howToPlay: [
		'① メンバーを登録（2〜12名）して、盤面サイズ（小/中/大）を選ぼう！',
		'② 順番にカードを2枚めくる神経衰弱！揃っても揃わなくても次の人へ',
		'③ ペアが揃うと罰ゲームがドン！と発表。揃えた人が「誰にやらせるか」を指名しよう！',
		'④ ジョーカーは引いた本人が特大罰！全ペア消化で獲得ペア数ランキングを発表！',
	],
	Component: InshuSuijakuGame,
}
