import { act, fireEvent, render } from '@testing-library/react-native'
import { haptics } from '@/lib/haptics'
import { CountSelect } from '../count-select'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('@/components/ui/gradient-button', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, Text } = require('react-native')
	return {
		GradientButton: ({
			title,
			onPress,
			disabled,
		}: {
			title: string
			onPress: () => void
			disabled?: boolean
		}) => (
			<Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
				<Text>{title}</Text>
			</Pressable>
		),
	}
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

describe('CountSelect', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('人数と限定パック導線と開始ボタンを表示する', async () => {
		const { getByText, getByTestId, getByLabelText, queryByText } = await render(
			<CountSelect count={4} onChangeCount={jest.fn()} onDeal={jest.fn()} />,
		)

		expect(getByText('あそぶ人数')).toBeTruthy()
		expect(getByText('4人')).toBeTruthy()
		expect(getByLabelText('人数を減らす')).toBeTruthy()
		expect(getByLabelText('人数を増やす')).toBeTruthy()
		expect(getByTestId('icon-lock')).toBeTruthy()
		expect(getByText('限定お題パック')).toBeTruthy()
		expect(queryByText('🔒 限定お題パック')).toBeNull()
		expect(getByText('番号を配る')).toBeTruthy()
	})

	it('増減と開始操作を親へ通知する', async () => {
		const onChangeCount = jest.fn()
		const onDeal = jest.fn()
		const { getByText, getByLabelText } = await render(
			<CountSelect count={4} onChangeCount={onChangeCount} onDeal={onDeal} />,
		)

		await act(async () => {
			fireEvent.press(getByLabelText('人数を増やす'))
		})
		await act(async () => {
			fireEvent.press(getByLabelText('人数を減らす'))
		})
		await act(async () => {
			fireEvent.press(getByText('番号を配る'))
		})

		expect(onChangeCount).toHaveBeenCalledWith(5)
		expect(onChangeCount).toHaveBeenCalledWith(3)
		expect(onDeal).toHaveBeenCalledTimes(1)
		expect(haptics.tap).toHaveBeenCalledTimes(2)
	})

	it('限定パック行で案内モーダルを開き、とじるで閉じる', async () => {
		const { getByText, queryByText } = await render(
			<CountSelect count={4} onChangeCount={jest.fn()} onDeal={jest.fn()} />,
		)

		await act(async () => {
			fireEvent.press(getByText('限定お題パック'))
		})

		expect(getByText(/解放中/)).toBeTruthy()
		expect(getByText(/限定お題が混ざります/)).toBeTruthy()

		await act(async () => {
			fireEvent.press(getByText('とじる'))
		})

		expect(queryByText(/解放中/)).toBeNull()
	})

	it('限定パック行はガラス面で描画される', async () => {
		const { getByText } = await render(
			<CountSelect count={4} onChangeCount={jest.fn()} onDeal={jest.fn()} />,
		)

		expect(hasAncestorTestId(getByText('限定お題パック'), 'glass-surface-pseudo')).toBe(true)
	})
})
