import { act, fireEvent, render } from '@testing-library/react-native'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import type { Card } from '../engine'
import { CardGrid, cellHeightFor, cellWidthFor } from '../card-grid'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('expo-image', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { Image: View }
})
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
	}
})

function card(id: string, overrides: Partial<Card> = {}): Card {
	return {
		id,
		pairId: 'p1',
		rank: '7',
		suit: '♥',
		punishmentId: 'n07',
		punishment: '全員と乾杯して1杯',
		state: 'hidden',
		...overrides,
	}
}

const deck = [
	card('p1-a'),
	card('p1-b'),
	card('joker-1', {
		pairId: null,
		rank: 'JOKER',
		suit: null,
		punishmentId: 's01',
		punishment: 'グラスの残りを飲み干す（無理は禁物！）',
		state: 'hidden',
	}),
]

// テスト環境では onLayout が自動発火しないため、実測相当のレイアウトを手動で発火する
function fireGridLayout(grid: Parameters<typeof fireEvent>[0], width = 360, height = 600) {
	fireEvent(grid, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } })
}

function expectExplicitCellHeight(style: StyleProp<ViewStyle>) {
	const flattened = StyleSheet.flatten(style)
	expect(typeof flattened?.width).toBe('number')
	const width = flattened?.width
	if (typeof width !== 'number') {
		throw new Error('cell width must be measured before height assertion')
	}
	expect(flattened?.height).toBe(Math.floor(width / 0.7))
}

it('hidden カードのタップで onFlip が呼ばれる', async () => {
	const onFlip = jest.fn()
	const utils = await render(
		<CardGrid cards={deck} columns={4} matchAnimIds={[]} onFlip={onFlip} />,
	)
	await act(async () => {
		fireGridLayout(utils.getByTestId('ns-card-grid'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	expect(onFlip).toHaveBeenCalledWith('p1-a')
})

it('disabled 中・hidden 以外のカードは onFlip されない', async () => {
	const onFlip = jest.fn()
	const revealed = deck.map((c) => (c.id === 'p1-a' ? { ...c, state: 'revealed' as const } : c))
	const utils = await render(
		<CardGrid cards={revealed} columns={4} matchAnimIds={[]} onFlip={onFlip} disabled />,
	)
	await act(async () => {
		fireGridLayout(utils.getByTestId('ns-card-grid'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード2'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('7♥'))
	})
	expect(onFlip).not.toHaveBeenCalled()
})

it('秘匿: revealed でも罰テキストは描画されない', async () => {
	const revealed = deck.map((c) => ({ ...c, state: 'revealed' as const }))
	const utils = await render(
		<CardGrid cards={revealed} columns={4} matchAnimIds={[]} onFlip={jest.fn()} />,
	)
	await act(async () => {
		fireGridLayout(utils.getByTestId('ns-card-grid'))
	})
	expect(utils.queryByText('全員と乾杯して1杯')).toBeNull()
	expect(utils.queryByText(/グラスの残りを飲み干す/)).toBeNull()
})

it('成立演出: matchAnimIds のカードにだけ罰テキストがうっすら出る', async () => {
	const revealed = deck.map((c) => (c.pairId === 'p1' ? { ...c, state: 'revealed' as const } : c))
	const utils = await render(
		<CardGrid
			cards={revealed}
			columns={4}
			matchAnimIds={['p1-a', 'p1-b']}
			onFlip={jest.fn()}
		/>,
	)
	await act(async () => {
		fireGridLayout(utils.getByTestId('ns-card-grid'))
	})
	expect(utils.getAllByText('全員と乾杯して1杯')).toHaveLength(2)
	expect(utils.queryByText(/グラスの残りを飲み干す/)).toBeNull()
})

describe('cellHeightFor', () => {
	it('セル幅からカード素材比率の高さを返す', () => {
		expect(cellHeightFor(84)).toBe(120)
	})

	it('未測定（0）のときは 0 を返す', () => {
		expect(cellHeightFor(0)).toBe(0)
	})
})

it('全セルに明示的な height が付く', async () => {
	const mixedDeck = [
		card('hidden-card', { state: 'hidden' }),
		card('removed-card', { state: 'removed' }),
		card('revealed-card', { state: 'revealed' }),
	]
	const utils = await render(
		<CardGrid cards={mixedDeck} columns={3} matchAnimIds={[]} onFlip={jest.fn()} />,
	)
	await act(async () => {
		fireGridLayout(utils.getByTestId('ns-card-grid'))
	})

	expectExplicitCellHeight(utils.getByLabelText('カード1').props.style)
	expectExplicitCellHeight(utils.getByLabelText('7♥').props.style)
	expectExplicitCellHeight(utils.getByTestId('ns-cell-removed-2').props.style)
})

describe('cellWidthFor', () => {
	it('幅が余って高さが厳しいケースでは高さフィット側が選ばれる', () => {
		// 360×500, 4列, 20枚: byWidth=84, byHeight=65.52 → 高さ側(65)
		expect(cellWidthFor(360, 500, 4, 20, 8)).toBe(65)
	})

	it('高さが余るケースでは幅フィット側が選ばれる', () => {
		// 360×900, 4列, 16枚: byWidth=84, byHeight=153.3 → 幅側(84)
		expect(cellWidthFor(360, 900, 4, 16, 8)).toBe(84)
	})

	it('境界値は floor される', () => {
		// 100×1000, 3列, 6枚, gap10: byWidth=26.666... → 26 に floor
		expect(cellWidthFor(100, 1000, 3, 6, 10)).toBe(26)
	})

	it('未測定（0）のときは 0 を返す', () => {
		expect(cellWidthFor(0, 0, 4, 16, 8)).toBe(0)
	})
})
