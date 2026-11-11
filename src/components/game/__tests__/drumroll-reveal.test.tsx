import { render } from '@testing-library/react-native'
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'
import { DrumrollReveal } from '../drumroll-reveal'

jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: () => <View testID="lottie-view" />,
	}
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
		withRepeat: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
	}
})

it('rolling: 素材が登録されていれば Lottie を表示する', async () => {
	const { getByTestId, queryByText } = await render(<DrumrollReveal phase="rolling" />)
	expect(getByTestId('lottie-view')).toBeTruthy()
	expect(queryByText('？？？')).toBeNull()
})

it('rolling: lottie={false} なら素材があっても「？？？」を表示する', async () => {
	const { getByText, queryByTestId } = await render(
		<DrumrollReveal phase="rolling" lottie={false} />,
	)
	expect(getByText('？？？')).toBeTruthy()
	expect(queryByTestId('lottie-view')).toBeNull()
})

it('revealed: lottie={false} なら celebrate 素材を再生せず children のみ表示する', async () => {
	const { getByText, queryByTestId } = await render(
		<DrumrollReveal phase="revealed" lottie={false}>
			<Text>4.98秒</Text>
		</DrumrollReveal>,
	)
	expect(getByText('4.98秒')).toBeTruthy()
	expect(queryByTestId('lottie-view')).toBeNull()
})

// RNTL v14 の要素型と react-test-renderer の型が非互換のため、必要な形だけの構造的型で受ける
type StyledNode = { parent: StyledNode | null; props: { style?: StyleProp<ViewStyle> } }

// 祖先の要素に指定されている alignSelf を集める
function ancestorAlignSelfs(node: StyledNode): unknown[] {
	const values: unknown[] = []
	for (let current = node.parent; current; current = current.parent) {
		const value = StyleSheet.flatten(current.props.style)?.alignSelf
		if (value !== undefined) values.push(value)
	}
	return values
}

it('revealed: 既定では children を親の幅に広げない（内容の幅のまま中央に置く）', async () => {
	const { getByText } = await render(
		<DrumrollReveal phase="revealed">
			<Text>4番！</Text>
		</DrumrollReveal>,
	)
	expect(ancestorAlignSelfs(getByText('4番！'))).not.toContain('stretch')
})

it('revealed: fill なら children を親の幅いっぱいに広げる（issue #167）', async () => {
	const { getByText } = await render(
		<DrumrollReveal phase="revealed" fill>
			<Text>ランキング</Text>
		</DrumrollReveal>,
	)
	expect(ancestorAlignSelfs(getByText('ランキング'))).toContain('stretch')
})
