import type { GameMeta } from '../types'
import { KimagureOxGame } from './kimagure-ox-game'

export const meta: GameMeta = {
	id: 'kimagure-ox',
	title: 'きまぐれ◯×',
	tagline: '普通じゃない◯×ゲーム',
	emoji: '⭕',
	gradient: ['#F7B731', '#E67E22'],
	minPlayers: 2,
	maxPlayers: 2,
	thumbnail: require('@/assets/images/kimagure-ox/intro.jpg'),
	cardThumbnail: require('@/assets/images/kimagure-ox/card.jpg'),
	howToPlay: [
		'① 交互にマスをタップして、タテ・ヨコ・ナナメに3つ並べたら勝ち！',
		'② ただしターンの合間に「きまぐれイベント」がランダム発生！',
		'③ イベントは マスシャッフル / 1マス封鎖 / 駒消滅 / ダブル手番 の4種類',
		'④ イベントで3つ並んでも勝ち。何が起きても恨みっこなし！',
	],
	Component: KimagureOxGame,
}
