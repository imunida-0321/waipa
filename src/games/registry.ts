import type { ComponentType } from 'react'
import { BombGame } from './bomb-216/bomb-game'
import { ComingSoonGame } from './coming-soon'
import { WhoWillPayGame } from './who-will-pay/who-will-pay-game'

export type GameMeta = {
	id: string
	title: string
	tagline: string
	emoji: string
	gradient: readonly [string, string]
	minPlayers: number
	maxPlayers: number
	requiresPlayers?: boolean
	howToPlay: readonly string[]
	Component: ComponentType
}

// MVP 8ゲーム。Component は各ゲーム Issue (#9〜#16) で差し替える
export const games: readonly GameMeta[] = [
	{
		id: 'who-will-pay',
		title: 'Who will pay',
		tagline: '会計はルーレットで決めよう！',
		emoji: '💸',
		gradient: ['#E85BF7', '#7B5CFA'],
		minPlayers: 2,
		maxPlayers: 8,
		requiresPlayers: true,
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜8名、各自に色がつきます）',
			'② お会計の合計金額を入力しよう！',
			'③ 「GO!」で桁ごとにルーレットを回そう！（点滅中の桁が対象）',
			'④ 各桁の色と名前の人が、その桁の金額を支払おう！',
		],
		Component: WhoWillPayGame,
	},
	{
		id: 'bomb-2-16',
		title: 'BOMB!! 2/16',
		tagline: '16個のボタンにハズレが2個！',
		emoji: '💣',
		gradient: ['#FF6B6B', '#C0392B'],
		minPlayers: 2,
		maxPlayers: 12,
		howToPlay: [
			'① 16個のボタンのどこかに爆弾が2個…（💣1人負け ＋ 💥全員負け）',
			'② スマホを回して、1人1個ずつタップ！セーフなら次の人へ',
			'③ 爆弾を引いた瞬間ゲーム終了！💣なら引いた人だけ負け、💥なら全員負け！',
			'④ 開けるほど爆弾の確率アップ。どこまで攻める？',
		],
		Component: BombGame,
	},
	{
		id: 'five-sec-stop',
		title: '5秒STOP',
		tagline: '5秒ぴったりで止めろ！',
		emoji: '⏱️',
		gradient: ['#4ECDC4', '#2C7A7B'],
		minPlayers: 2,
		maxPlayers: 12,
		howToPlay: [
			'タイマーを 5.00 秒ぴったりを狙って止めます',
			'途中から数字は見えなくなります！',
			'一番ズレた人が負け',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'kimagure-ox',
		title: 'きまぐれ◯×',
		tagline: '普通じゃない◯×ゲーム',
		emoji: '⭕',
		gradient: ['#F7B731', '#E67E22'],
		minPlayers: 2,
		maxPlayers: 2,
		howToPlay: [
			'普通の◯×ゲーム…と思いきや、ターンの合間に「きまぐれイベント」が発生！',
			'マスが入れ替わったり、駒が消えたり。最後に笑うのは誰だ',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'no-king-game',
		title: '王様のいない王様ゲーム',
		tagline: 'お題も実行役もランダム！',
		emoji: '👑',
		gradient: ['#F1C40F', '#B7791F'],
		minPlayers: 3,
		maxPlayers: 12,
		howToPlay: [
			'全員に番号が配られます（自分の番号は内緒）',
			'お題と実行する番号がランダムで発表されます',
			'王様はいないので、誰も文句は言えません！',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'pointing-heat-up',
		title: '指差しヒートアップ',
		tagline: 'せーので一斉に指差せ！',
		emoji: '👉',
		gradient: ['#FF9F43', '#EE5253'],
		minPlayers: 3,
		maxPlayers: 12,
		howToPlay: [
			'お題（例:「一番寝坊しそうな人」）が表示されます',
			'カウントダウンで全員一斉に「その人」を指差します',
			'一番指を差された人が負け！',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'bomb-relay',
		title: 'カウントダウン爆弾リレー',
		tagline: '爆発した時に持ってた人が負け',
		emoji: '🧨',
		gradient: ['#A55EEA', '#8854D0'],
		minPlayers: 3,
		maxPlayers: 12,
		howToPlay: [
			'お題に答えたらスマホを次の人へ回します',
			'爆弾のタイマーはランダム。チクタク音が速くなってきたら…',
			'爆発した瞬間に持っていた人が負け！',
		],
		Component: ComingSoonGame,
	},
	{
		id: 'reaction-pairs',
		title: 'リアクション神経衰弱',
		tagline: 'ペアが揃ったら罰ゲーム!?',
		emoji: '🃏',
		gradient: ['#26DE81', '#20BF6B'],
		minPlayers: 2,
		maxPlayers: 12,
		howToPlay: [
			'みんなで順番にカードをめくる神経衰弱',
			'ペアが揃った瞬間、罰ゲーム対象者がルーレットで決定！',
			'ジョーカーを引いた人は即アウト',
		],
		Component: ComingSoonGame,
	},
]

export function getGame(id: string): GameMeta | undefined {
	return games.find((g) => g.id === id)
}
