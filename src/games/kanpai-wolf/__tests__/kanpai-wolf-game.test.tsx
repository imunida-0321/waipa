import { act, fireEvent, render } from '@testing-library/react-native'
import { KanpaiWolfGame } from '../kanpai-wolf-game'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('expo-router', () => ({
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))
jest.mock('@/lib/players-store', () => ({
	usePlayers: () => ({ count: 3, names: ['あか', 'あお', 'き'], history: [] }),
	getDisplayNames: () => ['あか', 'あお', 'き'],
}))
jest.mock('@/lib/word-pairs-store', () => ({
	useWordPairs: () => ({ pairs: [], fetchedAt: null }),
	getPairsByPack: () => [{ id: 'p1', pack: 'food', word_a: 'ラーメン', word_b: 'うどん' }],
}))

// rng を 0 固定: ウルフ= index 0（あか）、多数派= word_a（ラーメン）、pair は先頭
beforeEach(() => {
	jest.spyOn(Math, 'random').mockReturnValue(0)
	jest.useFakeTimers()
})
afterEach(() => {
	;(Math.random as jest.Mock).mockRestore?.()
	jest.useRealTimers()
})

async function press(ui: Awaited<ReturnType<typeof render>>, label: string | RegExp) {
	await act(async () => {
		fireEvent.press(typeof label === 'string' ? ui.getByText(label) : ui.getByText(label))
	})
}

async function dealOne(ui: Awaited<ReturnType<typeof render>>, last: boolean) {
	const pad = ui.getByLabelText('長押しで自分のお題を表示')
	await act(async () => {
		fireEvent(pad, 'pressIn')
	})
	await act(async () => {
		fireEvent(pad, 'pressOut')
	})
	await press(ui, last ? '確認した（乾杯ルールへ！）' : '確認した（次の人へ）')
}

async function voteOne(ui: Awaited<ReturnType<typeof render>>, targetName: string) {
	await press(ui, '投票する')
	await press(ui, targetName)
	await press(ui, 'この人に投票（確定）')
}

it('設定→配布→議論→投票→発表→逆転→結果まで通しでプレイできる', async () => {
	const ui = await render(<KanpaiWolfGame />)

	// setup
	expect(ui.getByText('はじめる')).toBeTruthy()
	await press(ui, 'はじめる')

	// deal ×3（ウルフは あか＝index 0。あか の長押しで「うどん」が見える）
	const pad = ui.getByLabelText('長押しで自分のお題を表示')
	await act(async () => {
		fireEvent(pad, 'pressIn')
	})
	expect(ui.getByText('うどん')).toBeTruthy()
	await act(async () => {
		fireEvent(pad, 'pressOut')
	})
	await press(ui, '確認した（次の人へ）')
	await dealOne(ui, false)
	await dealOne(ui, true)

	// trigger-reveal（rng 0 固定: TRIGGERS[0] が選ばれる）
	expect(ui.getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
	await press(ui, '議論スタート')

	// discuss → スキップ（2度押し）
	await press(ui, '投票へすすむ')
	await press(ui, 'もう一度タップで投票へ！')

	// vote: あか→あお / あお→あか / き→あか ⇒ あか（ウルフ）が吊られる
	await voteOne(ui, 'あお')
	await voteOne(ui, 'あか')
	await voteOne(ui, 'あか')

	// reveal（ドラムロール2秒）
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	expect(ui.getByText(/🐺 ウルフ！/)).toBeTruthy()
	await press(ui, '逆転チャンスへ')

	// reversal: 外した → 市民の勝ち
	await press(ui, '宣言した！お題を開ける')
	expect(ui.getByText('ラーメン')).toBeTruthy()
	await press(ui, '外した')

	// result
	expect(ui.getByText(/市民チームの勝利/)).toBeTruthy()
	expect(ui.getByText(/あか/)).toBeTruthy() // ウルフの正体公開
	expect(ui.getByText(/このラウンドの乾杯/)).toBeTruthy()
	expect(ui.getByText('もう一回')).toBeTruthy()
})

it('通常投票が全員同票のとき決選投票を経て決着し reveal に進む', async () => {
	const ui = await render(<KanpaiWolfGame />)

	// setup
	await press(ui, 'はじめる')

	// deal ×3
	await dealOne(ui, false)
	await dealOne(ui, false)
	await dealOne(ui, true)

	// trigger-reveal（rng 0 固定: TRIGGERS[0] が選ばれる）
	expect(ui.getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
	await press(ui, '議論スタート')

	// discuss → スキップ（2度押し）
	await press(ui, '投票へすすむ')
	await press(ui, 'もう一度タップで投票へ！')

	// 通常投票: あか→あお / あお→き / き→あか（全員バラバラ＝全員同票）
	await voteOne(ui, 'あお')
	await voteOne(ui, 'き')
	await voteOne(ui, 'あか')

	// 決選投票が成立せず、再議論（runoff-discuss）へ
	expect(ui.getByText(/決選投票/)).toBeTruthy()

	// runoff-discuss もスキップ（2度押し）で再投票へ
	await press(ui, '投票へすすむ')
	await press(ui, 'もう一度タップで投票へ！')

	// 再投票: あか→あお / あお→あか / き→あか ⇒ あか（ウルフ）に2票集中して決着
	await voteOne(ui, 'あお')
	await voteOne(ui, 'あか')
	await voteOne(ui, 'あか')

	// reveal（ドラムロール2秒）
	await act(async () => {
		jest.advanceTimersByTime(2000)
	})
	expect(ui.getByText(/🐺 ウルフ！/)).toBeTruthy()
})
