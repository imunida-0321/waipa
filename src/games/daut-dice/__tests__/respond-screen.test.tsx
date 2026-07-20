import { act, fireEvent, render } from '@testing-library/react-native'
import { RespondScreen } from '../respond-screen'

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

it('宣言と2択を表示し、それぞれのコールバックが動く', async () => {
	const onDoubt = jest.fn()
	const onBelieve = jest.fn()
	const { getByText } = await render(
		<RespondScreen
			declarerName="あか"
			declaration={54}
			onDoubt={onDoubt}
			onBelieve={onBelieve}
		/>,
	)
	expect(getByText(/あかさんの宣言/)).toBeTruthy()
	expect(getByText('54')).toBeTruthy()
	// fireEvent.press は必ず1回ずつ await act で包む（連打すると次の render が壊れる）
	await act(async () => {
		fireEvent.press(getByText('ダウト！'))
	})
	expect(onDoubt).toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(getByText('信じて振る'))
	})
	expect(onBelieve).toHaveBeenCalled()
})

it('21（ミエ）宣言ではダウトのみ', async () => {
	const { getByText, queryByText } = await render(
		<RespondScreen
			declarerName="あか"
			declaration={21}
			onDoubt={jest.fn()}
			onBelieve={jest.fn()}
		/>,
	)
	expect(getByText('21（ミエ）')).toBeTruthy()
	expect(queryByText('信じて振る')).toBeNull()
	expect(getByText(/21はダウトのみ/)).toBeTruthy()
})

describe('ガラス面', () => {
	it('宣言カードはガラス面で描画される', async () => {
		const { getByText } = await render(
			<RespondScreen
				declarerName="あか"
				declaration={54}
				onDoubt={jest.fn()}
				onBelieve={jest.fn()}
			/>,
		)

		expect(hasAncestorTestId(getByText('54'), 'glass-surface-pseudo')).toBe(true)
	})
})
