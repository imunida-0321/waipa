import { act, fireEvent, render } from '@testing-library/react-native'
import type { Card } from '../engine'
import { CardGrid } from '../card-grid'

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
	card('joker-1', { pairId: null, rank: 'JOKER', suit: null, punishmentId: 's01', punishment: 'グラスの残りを飲み干す（無理は禁物！）', state: 'hidden' }),
]

it('hidden カードのタップで onFlip が呼ばれる', async () => {
	const onFlip = jest.fn()
	const utils = await render(
		<CardGrid cards={deck} columns={4} matchAnimIds={[]} onFlip={onFlip} />,
	)
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
		fireEvent.press(utils.getByLabelText('カード2'))
	})
	await act(async () => {
		fireEvent.press(utils.getByLabelText('カード1'))
	})
	expect(onFlip).not.toHaveBeenCalled()
})

it('秘匿: revealed でも罰テキストは描画されない', async () => {
	const revealed = deck.map((c) => ({ ...c, state: 'revealed' as const }))
	const utils = await render(
		<CardGrid cards={revealed} columns={4} matchAnimIds={[]} onFlip={jest.fn()} />,
	)
	expect(utils.queryByText('全員と乾杯して1杯')).toBeNull()
	expect(utils.queryByText(/グラスの残りを飲み干す/)).toBeNull()
})

it('成立演出: matchAnimIds のカードにだけ罰テキストがうっすら出る', async () => {
	const revealed = deck.map((c) =>
		c.pairId === 'p1' ? { ...c, state: 'revealed' as const } : c,
	)
	const utils = await render(
		<CardGrid
			cards={revealed}
			columns={4}
			matchAnimIds={['p1-a', 'p1-b']}
			onFlip={jest.fn()}
		/>,
	)
	expect(utils.getAllByText('全員と乾杯して1杯')).toHaveLength(2)
	expect(utils.queryByText(/グラスの残りを飲み干す/)).toBeNull()
})
