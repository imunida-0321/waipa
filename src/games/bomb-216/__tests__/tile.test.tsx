import { fireEvent, render } from '@testing-library/react-native'
import { Tile } from '../tile'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
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
		withSequence: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
	}
})

describe('Tile', () => {
	it('hidden タイルはラベルなしでタップで onPress(index) を呼ぶ', async () => {
		const onPress = jest.fn()
		const { getByTestId, queryByText } = await render(
			<Tile index={4} state="hidden" revealed={false} onPress={onPress} />,
		)
		expect(queryByText('5')).toBeNull()
		fireEvent.press(getByTestId('tile-4'))
		expect(onPress).toHaveBeenCalledWith(4)
	})

	it('safe 開封済みは絵文字を表示せずタップ不能', async () => {
		const onPress = jest.fn()
		const { getByTestId, queryByText } = await render(
			<Tile index={0} state="safe" revealed={false} onPress={onPress} />,
		)
		expect(queryByText('🍀')).toBeNull()
		fireEvent.press(getByTestId('tile-0'))
		expect(onPress).not.toHaveBeenCalled()
	})

	it('開封済み爆弾マスも絵文字は表示しない（演出は Lottie 側）', async () => {
		const a = await render(<Tile index={0} state="solo" revealed={false} onPress={jest.fn()} />)
		expect(a.queryByText('💣')).toBeNull()
		const b = await render(<Tile index={0} state="all" revealed={false} onPress={jest.fn()} />)
		expect(b.queryByText('💥')).toBeNull()
	})

	it('revealed 時は未開封の爆弾マスだけ絵文字で場所を示しタップ不能', async () => {
		const onPress = jest.fn()
		const bomb = await render(
			<Tile index={2} state="hidden" revealed={true} bombKind="solo" onPress={onPress} />,
		)
		expect(bomb.getByText('💣')).toBeTruthy()
		fireEvent.press(bomb.getByTestId('tile-2'))
		expect(onPress).not.toHaveBeenCalled()

		const safe = await render(
			<Tile index={3} state="hidden" revealed={true} bombKind={null} onPress={onPress} />,
		)
		expect(safe.queryByText('🍀')).toBeNull()
	})
})
