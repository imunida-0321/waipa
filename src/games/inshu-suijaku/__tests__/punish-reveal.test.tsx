import { act, fireEvent, render } from '@testing-library/react-native'
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
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View, Text } = require('react-native')
	return {
		__esModule: true,
		default: { View, Text },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
		withSpring: jest.fn((toValue: number) => toValue),
		withDelay: jest.fn((_delay: number, animation: unknown) => animation),
	}
})

it('ペア成立: 罰全文＋煽り＋実行した！で onDone', async () => {
	const onDone = jest.fn()
	const utils = await render(
		<PunishReveal
			punish={{
				kind: 'pair',
				punishmentId: 'n07',
				text: '全員と乾杯して1杯',
				playerIndex: 0,
			}}
			playerName="あか"
			playerIndex={0}
			onDone={onDone}
		/>,
	)
	expect(utils.getByText('全員と乾杯して1杯')).toBeTruthy()
	expect(utils.getByText(/あかさん、誰にやらせる？/)).toBeTruthy()
	await act(async () => {
		fireEvent.press(utils.getByText('実行した！'))
	})
	expect(onDone).toHaveBeenCalled()
})

it('ジョーカー: 特大罰表記＋本人実行の煽りになる', async () => {
	const utils = await render(
		<PunishReveal
			punish={{
				kind: 'joker',
				punishmentId: 's01',
				text: 'グラスの残りを飲み干す（無理は禁物！）',
				playerIndex: 1,
			}}
			playerName="あお"
			playerIndex={1}
			onDone={jest.fn()}
		/>,
	)
	expect(utils.getByText(/特大罰/)).toBeTruthy()
	expect(utils.getByText(/あおさんが実行！/)).toBeTruthy()
	expect(utils.queryByText(/誰にやらせる？/)).toBeNull()
})

it('n40 ラッキーカード: 拍手の煽りになり「誰にやらせる？」は出ない', async () => {
	const utils = await render(
		<PunishReveal
			punish={{
				kind: 'pair',
				punishmentId: 'n40',
				text: '何もなし！ラッキーカード（全員から拍手をもらう）',
				playerIndex: 2,
			}}
			playerName="みどり"
			playerIndex={2}
			onDone={jest.fn()}
		/>,
	)
	expect(utils.getByText(/ラッキー！全員から拍手！/)).toBeTruthy()
	expect(utils.queryByText(/誰にやらせる？/)).toBeNull()
})
