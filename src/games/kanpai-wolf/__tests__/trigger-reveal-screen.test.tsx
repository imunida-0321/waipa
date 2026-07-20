import { act, fireEvent, render } from '@testing-library/react-native'
import { TriggerRevealScreen } from '../trigger-reveal-screen'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

// RNTL v14 の要素型と react-test-renderer の型が非互換のため、必要な形だけの構造的型で受ける
type AncestorNode = { parent: AncestorNode | null; props: { testID?: unknown } }

function hasAncestorTestId(node: AncestorNode, testID: string): boolean {
	let current = node.parent
	while (current) {
		if (current.props.testID === testID) return true
		current = current.parent
	}
	return false
}

it('乾杯ルールを表示し「議論スタート」で onDone を呼ぶ', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<TriggerRevealScreen triggerText="誰かが質問されたら全員乾杯" onDone={onDone} />,
	)
	expect(getByText('🍻 今回の乾杯ルール')).toBeTruthy()
	expect(getByText('誰かが質問されたら全員乾杯')).toBeTruthy()
	expect(getByText('議論中にこのルールが起きたら、みんなで乾杯！')).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('議論スタート'))
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

describe('ガラス面', () => {
	it('乾杯ルールカードはガラス面で描画される', async () => {
		const { getByText } = await render(
			<TriggerRevealScreen triggerText="誰かが質問されたら全員乾杯" onDone={jest.fn()} />,
		)

		expect(hasAncestorTestId(getByText('誰かが質問されたら全員乾杯'), 'glass-surface-pseudo')).toBe(
			true,
		)
	})
})
