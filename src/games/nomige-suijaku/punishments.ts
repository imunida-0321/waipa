export type PunishmentType = 'normal' | 'special'

export type Punishment = {
	id: string
	text: string
	type: PunishmentType
}

// n40 は罰なしのラッキーカード。punish-reveal で煽り文言を差し替える
export const LUCKY_PUNISHMENT_ID = 'n40'

// 将来 topics-store の pack（Supabase 配信）に載せ替えられるよう ID を固定する
export const NORMAL_PUNISHMENTS: readonly Punishment[] = [
	{ id: 'n01', text: '1杯飲む', type: 'normal' },
	{ id: 'n02', text: '2杯飲む', type: 'normal' },
	{ id: 'n03', text: '3杯飲む', type: 'normal' },
	{ id: 'n04', text: 'グラス半分まで飲む', type: 'normal' },
	{ id: 'n05', text: '左隣の人と乾杯して1杯', type: 'normal' },
	{ id: 'n06', text: '右隣の人と乾杯して1杯', type: 'normal' },
	{ id: 'n07', text: '全員と乾杯して1杯', type: 'normal' },
	{ id: 'n08', text: 'ペアを揃えた人と乾杯して1杯', type: 'normal' },
	{ id: 'n09', text: '利き手と逆の手で1杯', type: 'normal' },
	{ id: 'n10', text: '目をつぶって1杯', type: 'normal' },
	{ id: 'n11', text: '「ありがとうございます！」とお礼を言ってから1杯', type: 'normal' },
	{ id: 'n12', text: '乾杯の音頭をとってから全員で1杯（自分は2杯）', type: 'normal' },
	{ id: 'n13', text: '片足立ちのまま1杯', type: 'normal' },
	{ id: 'n14', text: '立ち上がって一礼してから1杯', type: 'normal' },
	{ id: 'n15', text: 'ものまねを1つ披露、スベったら2杯', type: 'normal' },
	{ id: 'n16', text: '一発ギャグ、スベったら2杯', type: 'normal' },
	{ id: 'n17', text: '隣の人を30秒褒め続ける、噛んだら1杯', type: 'normal' },
	{ id: 'n18', text: '好きな人のタイプを発表、言えなければ2杯', type: 'normal' },
	{ id: 'n19', text: '最近の失敗談を1つ話す、話せなければ2杯', type: 'normal' },
	{ id: 'n20', text: '変顔を10秒キープ、笑ったら1杯', type: 'normal' },
	{ id: 'n21', text: '自分の第一印象を隣の人に聞いて1杯', type: 'normal' },
	{ id: 'n22', text: 'スマホの一番新しい写真を見せる、拒否なら3杯', type: 'normal' },
	{ id: 'n23', text: '今日イチ笑ったことを発表して1杯', type: 'normal' },
	{ id: 'n24', text: '「実は…」で始まる話を1つ、できなければ2杯', type: 'normal' },
	{ id: 'n25', text: 'ペアを揃えた人とじゃんけん、負けたら2杯・勝ったら1杯', type: 'normal' },
	{ id: 'n26', text: '早口言葉「生麦生米生卵」を3回、噛んだら1杯', type: 'normal' },
	{ id: 'n27', text: '次の自分の番まで敬語禁止、使ったら1杯', type: 'normal' },
	{ id: 'n28', text: '全員の名前をフルネームで言う、間違えたら1杯', type: 'normal' },
	{ id: 'n29', text: '好きな飲み物・銘柄を30秒熱弁して1杯', type: 'normal' },
	{ id: 'n30', text: '「今夜は帰さないぞ」とキメ顔で言って1杯', type: 'normal' },
	{ id: 'n31', text: '次の自分の番まで語尾は「にゃん」、忘れたら1杯', type: 'normal' },
	{ id: 'n32', text: '隣の人のグラスにドリンクを注いで、自分は1杯', type: 'normal' },
	{ id: 'n33', text: '秘密を1つ暴露、できなければ3杯', type: 'normal' },
	{ id: 'n34', text: '投げキッスを全員に、できなければ2杯', type: 'normal' },
	{ id: 'n35', text: '自己紹介をもう一度全力で、照れたら1杯', type: 'normal' },
	{ id: 'n36', text: '30秒間笑顔キープで1杯', type: 'normal' },
	{ id: 'n37', text: '隣の人と腕相撲、負けたら2杯', type: 'normal' },
	{ id: 'n38', text: '好きな芸人のギャグを1つ、スベったら2杯', type: 'normal' },
	{ id: 'n39', text: '「みんな大好き！」と叫んで1杯', type: 'normal' },
	{ id: 'n40', text: '何もなし！ラッキーカード（全員から拍手をもらう）', type: 'normal' },
]

export const SPECIAL_PUNISHMENTS: readonly Punishment[] = [
	{ id: 's01', text: 'グラスの残りを飲み干す（無理は禁物！）', type: 'special' },
	{ id: 's02', text: '全員のグラスにドリンクを注いで乾杯の音頭、自分は3杯', type: 'special' },
	{ id: 's03', text: '次のドリンクを全員分おごる宣言、できなければグラス半分', type: 'special' },
	{ id: 's04', text: '全員に一発芸、スベったら追加で2杯', type: 'special' },
	{
		id: 's05',
		text: '好きな人（または推し）を実名で発表、言えなければグラス半分',
		type: 'special',
	},
	{ id: 's06', text: 'LINEの最新トーク画面を見せる、拒否ならグラス半分', type: 'special' },
	{ id: 's07', text: 'ゲーム終了まで王様キャラで話す、素に戻ったら1杯', type: 'special' },
	{
		id: 's08',
		text: '全員から質問を1つずつ受けて正直に答える、パスは1回につき1杯',
		type: 'special',
	},
	{ id: 's09', text: '電話帳の5番目の人との思い出を語る、拒否ならグラス半分', type: 'special' },
	{ id: 's10', text: '幹事（いなければ最年長）に感謝を全力で伝えてグラス半分', type: 'special' },
]
