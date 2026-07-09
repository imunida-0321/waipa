import { fireEvent, render } from '@testing-library/react-native'
import { BoardView } from '../board'
import { emptyBoard, type Cell } from '../engine'

const B = (s: string): Cell[] => [...s].map((c) => (c === 'o' ? 'o' : c === 'x' ? 'x' : null))

it('9マスが描画され、空きマスのタップで onCellPress が呼ばれる', async () => {
	const onCellPress = jest.fn()
	const { getByTestId } = await render(
		<BoardView
			board={emptyBoard()}
			blocked={null}
			disabled={false}
			onCellPress={onCellPress}
		/>,
	)
	fireEvent.press(getByTestId('cell-4'))
	expect(onCellPress).toHaveBeenCalledWith(4)
	expect(getByTestId('cell-8')).toBeTruthy()
})

it('駒のあるマス・封鎖マスはタップしても反応しない', async () => {
	const onCellPress = jest.fn()
	const { getByTestId, getByText } = await render(
		<BoardView board={B('o........')} blocked={4} disabled={false} onCellPress={onCellPress} />,
	)
	fireEvent.press(getByTestId('cell-0'))
	fireEvent.press(getByTestId('cell-4'))
	expect(onCellPress).not.toHaveBeenCalled()
	expect(getByText('🚧')).toBeTruthy() // 封鎖マスの表示
})

it('disabled 中は空きマスも反応しない（カットイン表示中など）', async () => {
	const onCellPress = jest.fn()
	const { getByTestId } = await render(
		<BoardView board={emptyBoard()} blocked={null} disabled={true} onCellPress={onCellPress} />,
	)
	fireEvent.press(getByTestId('cell-0'))
	expect(onCellPress).not.toHaveBeenCalled()
})
