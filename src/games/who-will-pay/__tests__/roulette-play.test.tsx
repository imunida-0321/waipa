import { render } from '@testing-library/react-native'
import { amountToSlots, assignSlot } from '../payment'
import { RoulettePlay } from '../roulette-play'
import { useDigitRoulette } from '../use-digit-roulette'

jest.mock('../use-digit-roulette', () => ({ useDigitRoulette: jest.fn() }))
jest.mock('../roulette-wheel', () => ({ RouletteWheel: () => null }))
jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return { __esModule: true, default: { Text } }
})

const baseProps = {
	amount: 10,
	playerColors: ['red', 'blue'],
	playerNames: ['あか', 'あお'],
}

function rouletteState(
	allDone: boolean,
	slots = amountToSlots(10),
): ReturnType<typeof useDigitRoulette> {
	return {
		slots,
		currentIndex: allDone ? null : 0,
		isSpinning: false,
		allDone,
		spin: jest.fn(),
		rotation: {
			value: 0,
			get: () => 0,
			set: jest.fn(),
			addListener: jest.fn(),
			removeListener: jest.fn(),
			modify: jest.fn(),
		},
	}
}

beforeEach(() => jest.clearAllMocks())

describe('allDone effect の通知タイミング', () => {
	it('未完了中は通知せず、完了へ変化した時点の slots と onFinish で1回通知する', async () => {
		const initialFinish = jest.fn()
		const latestFinish = jest.fn()
		jest.mocked(useDigitRoulette).mockReturnValue(rouletteState(false))
		const { rerender } = await render(<RoulettePlay {...baseProps} onFinish={initialFinish} />)
		const completedSlots = assignSlot(amountToSlots(10), 0, 1)
		jest.mocked(useDigitRoulette).mockReturnValue(rouletteState(false, completedSlots))
		await rerender(<RoulettePlay {...baseProps} onFinish={latestFinish} />)
		expect(initialFinish).not.toHaveBeenCalled()
		expect(latestFinish).not.toHaveBeenCalled()

		jest.mocked(useDigitRoulette).mockReturnValue(rouletteState(true, completedSlots))
		await rerender(<RoulettePlay {...baseProps} onFinish={latestFinish} />)
		expect(latestFinish).toHaveBeenCalledTimes(1)
		expect(latestFinish).toHaveBeenCalledWith(completedSlots)
		const afterFinish = jest.fn()
		jest.mocked(useDigitRoulette).mockReturnValue(
			rouletteState(true, assignSlot(amountToSlots(20), 0, 0)),
		)
		await rerender(
			<RoulettePlay
				{...baseProps}
				amount={20}
				playerNames={['更新あか', '更新あお']}
				onFinish={afterFinish}
			/>,
		)
		await rerender(<RoulettePlay {...baseProps} onFinish={afterFinish} />)
		expect(initialFinish).not.toHaveBeenCalled()
		expect(latestFinish).toHaveBeenCalledTimes(1)
		expect(afterFinish).not.toHaveBeenCalled()
	})

	it('初回から全桁確定ならマウント時に1回通知し、再レンダーでは通知しない', async () => {
		const slots = amountToSlots(0)
		const onFinish = jest.fn()
		jest.mocked(useDigitRoulette).mockReturnValue(rouletteState(true, slots))
		const { rerender } = await render(
			<RoulettePlay {...baseProps} amount={0} onFinish={onFinish} />,
		)
		expect(onFinish).toHaveBeenCalledTimes(1)
		expect(onFinish).toHaveBeenCalledWith(slots)
		await rerender(<RoulettePlay {...baseProps} amount={0} onFinish={onFinish} />)
		expect(onFinish).toHaveBeenCalledTimes(1)
	})
})
