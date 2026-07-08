import { fireEvent, render } from '@testing-library/react-native'
import { Tile } from '../tile'

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSequence: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
	}
})

describe('Tile', () => {
	it('hidden タイルは番号を表示しタップで onPress(index) を呼ぶ', () => {
		const onPress = jest.fn()
		const { getByText } = render(
			<Tile index={4} state="hidden" revealed={false} onPress={onPress} />,
		)
		fireEvent.press(getByText('5'))
		expect(onPress).toHaveBeenCalledWith(4)
	})

	it('safe 開封済みは 🍀 を表示しタップ不能', () => {
		const onPress = jest.fn()
		const { getByText } = render(
			<Tile index={0} state="safe" revealed={false} onPress={onPress} />,
		)
		fireEvent.press(getByText('🍀'))
		expect(onPress).not.toHaveBeenCalled()
	})

	it('solo は 💣、all は 💥 を表示する', () => {
		const a = render(<Tile index={0} state="solo" revealed={false} onPress={jest.fn()} />)
		expect(a.getByText('💣')).toBeTruthy()
		const b = render(<Tile index={0} state="all" revealed={false} onPress={jest.fn()} />)
		expect(b.getByText('💥')).toBeTruthy()
	})

	it('revealed 時は hidden でも中身を表示しタップ不能', () => {
		const onPress = jest.fn()
		const { getByText, queryByText } = render(
			<Tile index={2} state="hidden" revealed={true} bombKind="solo" onPress={onPress} />,
		)
		expect(queryByText('3')).toBeNull()
		fireEvent.press(getByText('💣'))
		expect(onPress).not.toHaveBeenCalled()
	})
})
