import { act, fireEvent, render } from '@testing-library/react-native'
import { DeclareScreen } from '../declare-screen'

jest.mock('@/lib/haptics', () => ({ haptics: { tap: jest.fn(), heavy: jest.fn() } }))
jest.mock('@/lib/sound', () => ({ playSound: jest.fn() }))

it('最初は handoff 表示。宣言ボタンはまだ見えない', async () => {
	const { getByText, queryByText } = await render(
		<DeclareScreen playerName="あか" onDeclare={jest.fn()} />,
	)
	expect(getByText(/あかさんにスマホを渡して/)).toBeTruthy()
	expect(queryByText(/勝負/)).toBeNull()
})

it('受け取り後、長押しで「勝負」を確定できる（タップでは確定しない）', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareScreen playerName="あか" onDeclare={onDeclare} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	await act(async () => fireEvent.press(getByText(/勝負/)))
	expect(onDeclare).not.toHaveBeenCalled()
	await act(async () => fireEvent(getByText(/勝負/), 'longPress'))
	expect(onDeclare).toHaveBeenCalledWith('fight')
})

it('長押しで「降りる」を確定できる', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareScreen playerName="あか" onDeclare={onDeclare} />)
	await act(async () => fireEvent.press(getByText(/受け取った/)))
	await act(async () => fireEvent(getByText(/降りる/), 'longPress'))
	expect(onDeclare).toHaveBeenCalledWith('fold')
})
