import { act, fireEvent, render } from '@testing-library/react-native'
import { ForeheadScreen, PREP_SECONDS, SHOW_SECONDS } from '../forehead-screen'

jest.mock('@/lib/haptics', () => ({ haptics: { tap: jest.fn(), heavy: jest.fn() } }))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))

beforeEach(() => {
	jest.useFakeTimers()
})
afterEach(() => {
	jest.useRealTimers()
})

const props = {
	playerName: 'あか',
	playerColor: '#FF3B5C',
	card: 7,
	onDone: jest.fn(),
}

it('最初は handoff 表示。カードはまだ見えない', async () => {
	const { getByText, queryByText } = await render(<ForeheadScreen {...props} />)
	expect(getByText(/あかさんにスマホを渡して/)).toBeTruthy()
	expect(queryByText('7')).toBeNull()
})

it('受け取りタップ → 覗き見防止カウントダウン中もカードは見えない', async () => {
	const { getByText, queryByText, getByTestId } = await render(<ForeheadScreen {...props} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	expect(getByTestId('prep-countdown')).toBeTruthy()
	expect(getByText(/額に当てて/)).toBeTruthy()
	expect(queryByText('7')).toBeNull()
})

it('カウントダウン終了でカードが大表示され、5秒後に onDone が呼ばれる', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(<ForeheadScreen {...props} onDone={onDone} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	await act(async () => {
		jest.advanceTimersByTime(PREP_SECONDS * 1000)
	})
	expect(getByText('7')).toBeTruthy()
	expect(getByText(/あかさんのカードを覚えて/)).toBeTruthy()
	expect(onDone).not.toHaveBeenCalled()
	await act(async () => {
		jest.advanceTimersByTime(SHOW_SECONDS * 1000)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})

it('onDone は1回だけ。表示終了後に時間が経っても再発火しない', async () => {
	const onDone = jest.fn()
	const { getByText } = await render(<ForeheadScreen {...props} onDone={onDone} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	await act(async () => {
		jest.advanceTimersByTime(PREP_SECONDS * 1000)
	})
	await act(async () => {
		jest.advanceTimersByTime(SHOW_SECONDS * 1000)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
	await act(async () => {
		jest.advanceTimersByTime(3000)
	})
	expect(onDone).toHaveBeenCalledTimes(1)
})
