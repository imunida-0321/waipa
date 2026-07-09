import type { ComponentType } from 'react'
import { BombGame } from './bomb-216/bomb-game'
import { ComingSoonGame } from './coming-soon'
import { KimagureOxGame } from './kimagure-ox/kimagure-ox-game'
import { NoKingGame } from './no-king-game/no-king-game'
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
	/** イントロ画面のキャッチコピー（\n 可）。未指定なら tagline */
	catchCopy?: string
	/** イントロ画面の遊び方ダイジェスト。未指定なら howToPlay を連結 */
	summary?: string
	/** イントロ画面のサムネイル画像（require）。未指定なら絵文字＋グラデ */
	thumbnail?: number
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
		catchCopy: 'お会計の金額を一桁ずつルーレットで回し、\n誰が支払うかを決定します！',
		summary:
			'このゲームは、合計金額の各桁（千の位、百の位、十の位、一の位）を1桁ずつルーレットで決定し、その桁の金額を誰が支払うかをランダムに決めるゲームです！',
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
		catchCopy: '16個のボタンにハズレが2つ！\n勝敗は完全運ゲームで決まる！',
		summary:
			'このゲームは、16個のボタンから1つを選ぶだけ！中には「全員アウト」と「あなただけアウト」の2つのハズレが潜んでいる、完全運ゲーです！',
		thumbnail: require('@/assets/images/bomb/bg.jpg'),
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
			'① 交互にマスをタップして、タテ・ヨコ・ナナメに3つ並べたら勝ち！',
			'② ただしターンの合間に「きまぐれイベント」がランダム発生！',
			'③ イベントは マスシャッフル / 1マス封鎖 / 駒消滅 / ダブル手番 の4種類',
			'④ イベントで3つ並んでも勝ち。何が起きても恨みっこなし！',
		],
		Component: KimagureOxGame,
	},
	{
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
		howToPlay: [
			'① 人数を選んで「番号を配る」！スマホを回して各自こっそり番号を確認（長押しで表示）',
			'② お題が発表されたら「運命のボタン」をタップ！',
			'③ ドラムロールのあと実行役の番号がドン！と発表',
			'④ その番号の人は名乗り出てお題を実行！次のラウンドは番号を配り直してドキドキ継続',
		],
		Component: NoKingGame,
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
