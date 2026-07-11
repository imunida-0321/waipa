import { act, fireEvent, render } from '@testing-library/react-native'
import { DeclareList } from '../declare-list'

jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))

// RNTL v14 の fireEvent.press は Promise を返す — await act なしで連打すると
// 次の render が overlapping act() で壊れる。必ず1回ずつ await act で包む

it('prev=null なら全21役がタップ可能', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareList prev={null} onDeclare={onDeclare} />)
	await act(async () => {
		fireEvent.press(getByText('31'))
	})
	expect(onDeclare).toHaveBeenCalledWith(31)
	await act(async () => {
		fireEvent.press(getByText('21（ミエ）'))
	})
	expect(onDeclare).toHaveBeenCalledWith(21)
})

it('prev=54 のとき 54 以下は無効・65 は有効', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareList prev={54} onDeclare={onDeclare} />)
	await act(async () => {
		fireEvent.press(getByText('54'))
	})
	await act(async () => {
		fireEvent.press(getByText('31'))
	})
	expect(onDeclare).not.toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(getByText('65'))
	})
	expect(onDeclare).toHaveBeenCalledWith(65)
})

it('prev=66 のとき有効なのは 21（ミエ）のみ', async () => {
	const onDeclare = jest.fn()
	const { getByText } = await render(<DeclareList prev={66} onDeclare={onDeclare} />)
	await act(async () => {
		fireEvent.press(getByText('66（ゾロ目）'))
	})
	expect(onDeclare).not.toHaveBeenCalled()
	await act(async () => {
		fireEvent.press(getByText('21（ミエ）'))
	})
	expect(onDeclare).toHaveBeenCalledWith(21)
})
