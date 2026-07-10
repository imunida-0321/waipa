import { fireEvent, render } from '@testing-library/react-native'
import type { Card } from '../engine'
import { CardGrid } from '../card-grid'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
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

const cards: Card[] = [
	{ id: 'p1-a', kind: 'pair', pairId: 'p1', symbol: '🎤', state: 'hidden' },
	{ id: 'p1-b', kind: 'pair', pairId: 'p1', symbol: '🎤', state: 'revealed' },
	{ id: 'joker', kind: 'joker', pairId: null, symbol: '🃏', state: 'revealed' },
	{ id: 'lucky', kind: 'lucky', pairId: null, symbol: '🍀', state: 'removed' },
]

it('hidden カードのタップで onFlip が呼ばれる', async () => {
	const onFlip = jest.fn()
	const { getByLabelText } = await render(<CardGrid cards={cards} onFlip={onFlip} />)
	fireEvent.press(getByLabelText('カード1'))
	expect(onFlip).toHaveBeenCalledWith('p1-a')
})

it('revealed はシンボルが見え、タップしても onFlip は呼ばれない', async () => {
	const onFlip = jest.fn()
	const { getByText, getByLabelText } = await render(<CardGrid cards={cards} onFlip={onFlip} />)
	expect(getByText('🎤')).toBeTruthy()
	fireEvent.press(getByLabelText('🎤'))
	expect(onFlip).not.toHaveBeenCalled()
})

it('removed はシンボルを表示しない', async () => {
	const { queryByText } = await render(<CardGrid cards={cards} onFlip={jest.fn()} />)
	expect(queryByText('🍀')).toBeNull()
})

it('disabled 中は hidden をタップしても無視', async () => {
	const onFlip = jest.fn()
	const { getByLabelText } = await render(<CardGrid cards={cards} onFlip={onFlip} disabled />)
	fireEvent.press(getByLabelText('カード1'))
	expect(onFlip).not.toHaveBeenCalled()
})

it('JOKER は表記付きで表示される', async () => {
	const { getByText } = await render(<CardGrid cards={cards} onFlip={jest.fn()} />)
	expect(getByText('JOKER')).toBeTruthy()
})
