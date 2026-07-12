import type { ComponentType } from 'react'
import { BombGame } from './bomb-216/bomb-game'
import { BombRelayGame } from './bomb-relay/bomb-relay-game'
import { BurstChickenGame } from './burst-chicken/burst-chicken-game'
import { ChinchiroGame } from './chinchiro/chinchiro-game'
import { DautDiceGame } from './daut-dice/daut-dice-game'
import { FiveSecStopGame } from './five-sec-stop/five-sec-stop-game'
import { KimagureOxGame } from './kimagure-ox/kimagure-ox-game'
import { NoKingGame } from './no-king-game/no-king-game'
import { InshuSuijakuGame } from './inshu-suijaku/inshu-suijaku-game'
import { ReactionPairsGame } from './reaction-pairs/reaction-pairs-game'
import { WhoWillPayGame } from './who-will-pay/who-will-pay-game'
import { WordWolfGame } from './word-wolf/word-wolf-game'

export type GameMeta = {
	id: string
	title: string
	tagline: string
	emoji: string
	gradient: readonly [string, string]
	minPlayers: number
	maxPlayers: number
	requiresPlayers?: boolean
	/** プレミアム限定ゲーム（全体ロック）。ホームでマスク＋👑バッジ、非プレミアムはロックモーダル */
	premium?: boolean
	/** イントロ画面のキャッチコピー（\n 可）。未指定なら tagline */
	catchCopy?: string
	/** イントロ画面の遊び方ダイジェスト。未指定なら howToPlay を連結 */
	summary?: string
	/**
	 * イントロ画面のサムネイル画像（1:1・512px 推奨）。未指定なら絵文字＋グラデ。
	 * 命名規則: assets/images/<ゲームID>/intro.jpg（ゲーム内背景と兼用する場合は bg.jpg 可）
	 */
	thumbnail?: number
	/**
	 * ホームカードのキービジュアル（1.3:1・1040x800 推奨、タイトル文字入り前提）。未指定なら絵文字＋グラデ。
	 * 命名規則: assets/images/<ゲームID>/card.jpg
	 */
	cardThumbnail?: number
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
		thumbnail: require('@/assets/images/who-will-pay/intro.jpg'),
		cardThumbnail: require('@/assets/images/who-will-pay/card.jpg'),
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
		thumbnail: require('@/assets/images/bomb/intro.jpg'),
		cardThumbnail: require('@/assets/images/bomb/card.jpg'),
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
		requiresPlayers: true,
		catchCopy: '5.00秒ぴったりを狙ってストップ！\nでも途中から数字は見えない…！',
		summary:
			'このゲームは、タイマーを5.00秒ぴったりを狙って止めるゲームです！3秒をすぎると数字が見えなくなるので、最後は自分の体内時計だけが頼り。5.00秒から一番遠かった人が負けです！',
		thumbnail: require('@/assets/images/five-sec-stop/intro.jpg'),
		cardThumbnail: require('@/assets/images/five-sec-stop/card.jpg'),
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
			'② 自分の番が来たらタップでスタート！5.00秒ぴったりを狙ってもう一度タップ！',
			'③ 3秒をすぎると数字が見えなくなる！感覚だけが頼り！',
			'④ 全員の記録を発表！5.00秒から一番遠かった人が負け！（±0.05秒は「ぴったり賞」）',
		],
		Component: FiveSecStopGame,
	},
	{
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
		id: 'chinchiro',
		title: 'チンチロ',
		tagline: '丼とサイコロ3つの真剣勝負！',
		emoji: '🎲',
		gradient: ['#FF9F43', '#EE5253'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		catchCopy: 'サイコロ3つを丼に振って役で勝負！\n一番弱かった人が負け！',
		summary:
			'このゲームは、3個のサイコロを振って出た役の強さで勝負するチンチロです！役が出るまで最大3回振れます。ピンゾロ（1・1・1）が最強、ヒフミ（1・2・3）は最弱。丼からサイコロが飛び出す『ションベン』にも注意！',
		thumbnail: require('@/assets/images/chinchiro/intro.jpg'),
		cardThumbnail: require('@/assets/images/chinchiro/card.jpg'),
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
			'② 自分の番が来たらタップでサイコロを3つ振ろう！役が出たら確定、役なしなら最大3投まで振り直し！',
			'③ 役の強さは ピンゾロ＞アラシ＞シゴロ＞目＞目なし＞ヒフミ。ションベン（丼から飛び出し）はその投が無効に！',
			'④ 全員の役を発表！一番弱かった人が負け！（同率ならサドンデス勝負！）',
		],
		Component: ChinchiroGame,
	},
	{
		id: 'bomb-relay',
		title: 'カウントダウン爆弾リレー',
		tagline: '爆発した時に持ってた人が負け',
		emoji: '🧨',
		gradient: ['#A55EEA', '#8854D0'],
		minPlayers: 3,
		maxPlayers: 12,
		catchCopy: 'お題に答えてスマホを回せ！\n爆発した瞬間、持ってた人の負け！',
		summary:
			'このゲームは、お題（例「ラーメンの具といえば？」）に答えながらスマホを回すリレーゲームです！爆弾のタイマーはランダムで、チクタクがだんだん速くなり…爆発した瞬間に持っていた人が負けです！',
		howToPlay: [
			'① お題をみんなで確認して「スタート」！',
			'② お題に答えたら、すぐ次の人にスマホを手渡し！',
			'③ チクタクがだんだん速くなってきたら…爆発が近い！',
			'④ 💥 爆発した瞬間に持っていた人の負け！',
		],
		Component: BombRelayGame,
	},
	{
		id: 'reaction-pairs',
		title: 'リアクション神経衰弱',
		tagline: 'ペアが揃ったら罰ゲーム!?',
		emoji: '🃏',
		gradient: ['#26DE81', '#20BF6B'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		catchCopy: 'ペアが揃った瞬間、\n全員ルーレットで罰ゲーム対象者が決定！',
		summary:
			'このゲームは、4×4の神経衰弱です！ペアが揃うたびに全員ルーレットで罰ゲーム対象者を抽選。ジョーカーを引いたら即負け、ラッキー🍀を引けば罰免除パスがもらえます！',
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
			'② 順番にカードを2枚めくる神経衰弱！揃っても揃わなくても次の人へ',
			'③ ペアが揃った瞬間、全員ルーレットで罰ゲーム対象者が決定！',
			'④ ジョーカーは即負けで終了、ラッキー🍀は罰免除パス。全ペアそろえてもゴール！',
		],
		Component: ReactionPairsGame,
	},
	{
		id: 'burst-chicken',
		title: 'バーストチキン',
		tagline: '積みすぎたら爆発！宣言チキンレース',
		emoji: '🐔',
		gradient: ['#FF9F43', '#EE5253'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: '秘密の上限を超えたら爆発！\n積むか、ストップか、度胸の勝負！',
		summary:
			'このゲームは、21〜30のどこかに隠された上限に向かって +1/+2/+3 を積み上げるチキンレースです！超えた瞬間に爆発して負け。合計15からは「ストップ宣言」もでき、精算で一番積んでいない人が負けになります！',
		howToPlay: [
			'① 一緒に遊ぶメンバーを登録しよう！（2〜12名）',
			'② 順番に +1 / +2 / +3 を選んで合計に積もう！',
			'③ 秘密の上限（21〜30のどこか）を超えたら爆発！その人の負け！',
			'④ 合計15からは「ストップ宣言」もアリ。一番積んでいない人が負け！',
		],
		Component: BurstChickenGame,
	},
	{
		id: 'daut-dice',
		title: 'ダウトダイス',
		tagline: '嘘か本当か、宣言ブラフ勝負',
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
	},
	{
		id: 'word-wolf',
		title: 'ワードウルフ',
		tagline: 'ひとりだけ違うお題、誰だ？',
		emoji: '🐺',
		gradient: ['#6C5CE7', '#4834D4'],
		minPlayers: 3,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: 'みんな同じお題…のはずが1人だけ違う！\n会話で見抜け、バレずに逃げ切れ！',
		summary:
			'このゲームは、全員に配られたお題のうち1人だけ微妙に違うお題を持つ「ワードウルフ」を探すゲームです！議論で多数派を探り、投票でウルフを当てよう。ウルフは吊られても市民のお題を言い当てれば逆転勝ち！',
		howToPlay: [
			'① メンバーを登録（3〜12名）して、議論時間とお題パックを選ぼう！',
			'② スマホを回して、自分のお題を長押しでこっそり確認（1人だけ違うお題！）',
			'③ 議論タイム！お互いに質問して、ひとりだけ違う人（ウルフ）を探そう',
			'④ 投票で最多票の正体を発表！ウルフなら市民の勝ち。ただしウルフが市民のお題を当てたら逆転勝ち！',
		],
		Component: WordWolfGame,
	},
	{
		id: 'inshu-suijaku',
		title: '飲酒衰弱',
		tagline: 'ペアを揃えたら罰ゲーム発表！',
		emoji: '🍻',
		gradient: ['#FF6B81', '#B33939'],
		minPlayers: 2,
		maxPlayers: 12,
		requiresPlayers: true,
		premium: true,
		catchCopy: 'めくって揃えば罰ゲーム！\n誰にやらせるかは、あなた次第！',
		summary:
			'このゲームは、トランプの神経衰弱に罰ゲームを仕込んだ飲み会向けゲームです！ペアを揃えると隠されていた罰ゲームが発表され、揃えた人が実行者を指名。ジョーカーを引いたら特大罰を自分が実行！全ペア消化後、獲得ペア数のランキングを発表します！',
		howToPlay: [
			'① メンバーを登録（2〜12名）して、盤面サイズ（小/中/大）を選ぼう！',
			'② 順番にカードを2枚めくる神経衰弱！揃っても揃わなくても次の人へ',
			'③ ペアが揃うと罰ゲームがドン！と発表。揃えた人が「誰にやらせるか」を指名しよう！',
			'④ ジョーカーは引いた本人が特大罰！全ペア消化で獲得ペア数ランキングを発表！',
		],
		Component: InshuSuijakuGame,
	},
]

export function getGame(id: string): GameMeta | undefined {
	return games.find((g) => g.id === id)
}
