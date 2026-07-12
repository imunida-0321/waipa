import { act, fireEvent, render } from '@testing-library/react-native'
import { WordWolfGame } from '../word-wolf-game'

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
	await press(ui, last ? '確認した（議論スタート！）' : '確認した（次の人へ）')
}

async function voteOne(ui: Awaited<ReturnType<typeof render>>, targetName: string) {
	await press(ui, '投票する')
	await press(ui, targetName)
	await press(ui, 'この人に投票（確定）')
}

it('設定→配布→議論→投票→発表→逆転→結果まで通しでプレイできる', async () => {
	const ui = await render(<WordWolfGame />)

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
	expect(ui.getByText('もう一回')).toBeTruthy()
})
