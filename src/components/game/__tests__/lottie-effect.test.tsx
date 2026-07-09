import { act, render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { LottieEffect } from '../lottie-effect'

// LottieView をモックし、渡された props を検証できるようにする
let lastLottieProps: Record<string, unknown> | null = null
jest.mock('lottie-react-native', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: (props: Record<string, unknown>) => {
			lastLottieProps = props
			return <View testID="lottie-view" />
		},
	}
})

beforeEach(() => {
	lastLottieProps = null
})

it('source が null なら fallback を表示し LottieView は描画しない', async () => {
	const { getByText, queryByTestId } = await render(
		<LottieEffect source={null} fallback={<Text>代替演出</Text>} />,
	)
	expect(getByText('代替演出')).toBeTruthy()
	expect(queryByTestId('lottie-view')).toBeNull()
})

it('source があれば LottieView を描画し、loop が渡る', async () => {
	const { getByTestId, queryByText } = await render(
		<LottieEffect source={{ uri: 'test' }} loop fallback={<Text>代替演出</Text>} />,
	)
	expect(getByTestId('lottie-view')).toBeTruthy()
	expect(queryByText('代替演出')).toBeNull()
	expect(lastLottieProps?.loop).toBe(true)
	expect(lastLottieProps?.source).toEqual({ uri: 'test' })
	// 演出は装飾専用。下の UI（ボタン等）のタップを遮らない
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { StyleSheet } = require('react-native')
	expect(StyleSheet.flatten(lastLottieProps?.style)).toMatchObject({ pointerEvents: 'none' })
	// Web 実装は style を無視して webStyle しか見ないため、同内容を両方に渡す
	expect(lastLottieProps?.webStyle).toMatchObject({ pointerEvents: 'none' })
})

it('fallback 省略時に source が null なら何も描画しない', async () => {
	const { queryByTestId } = await render(<LottieEffect source={null} />)
	expect(queryByTestId('lottie-view')).toBeNull()
})

it('onAnimationFailure で fallback に切り替わる', async () => {
	const { getByTestId, getByText, queryByTestId } = await render(
		<LottieEffect source={{ uri: 'test' }} fallback={<Text>代替演出</Text>} />,
	)
	expect(getByTestId('lottie-view')).toBeTruthy()
	await act(async () => {
		;(lastLottieProps?.onAnimationFailure as (msg: string) => void)('load error')
	})
	expect(queryByTestId('lottie-view')).toBeNull()
	expect(getByText('代替演出')).toBeTruthy()
})
