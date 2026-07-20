import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactTestInstance } from 'react-test-renderer'
import { PunishReveal } from '../punish-reveal'

jest.mock('@/lib/sound', () => ({ playSound: jest.fn(), registerSound: jest.fn() }))
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('react-native-reanimated', () => ({
	__esModule: true,
	useAnimatedStyle: jest.fn(() => ({})),
	useSharedValue: jest.fn(() => ({ value: 0 })),
	withTiming: jest.fn((v) => v),
	getUseOfValueInStyleWarning: jest.fn(() => () => {}),
	createWorkletRuntime: jest.fn(),
	runOn: jest.fn((runtime, fn) => fn),
	runOnJS: jest.fn((fn) => fn),
}))
jest.mock('react-native-worklets', () => ({
	__esModule: true,
	Worklets: { defaultContext: {} },
}))

function hasAncestorTestId(node: ReactTestInstance, testID: string): boolean {
	let current = node.parent
	while (current) {
		if (current.props.testID === testID) return true
		current = current.parent
	}
	return false
}

it('対象者名とお題を表示し「実行した！」で onDone', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(
		<PunishReveal
			playerName="あお"
			playerIndex={1}
			topicText="一発ギャグをする"
			onDone={onDone}
		/>,
	)
	expect(getByText('あおさんが罰！')).toBeTruthy()
	expect(getByText('一発ギャグをする')).toBeTruthy()
	await act(async () => {
		fireEvent.press(getByText('実行した！'))
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

describe('ガラス面', () => {
	it('罰カードはガラス面で描画される', async () => {
		const { getByText } = await render(
			<PunishReveal
				playerName="あお"
				playerIndex={1}
				topicText="一発ギャグをする"
				onDone={jest.fn()}
			/>,
		)

		expect(hasAncestorTestId(getByText('一発ギャグをする'), 'glass-surface-blur')).toBe(true)
	})
})
