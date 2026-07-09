import { render } from '@testing-library/react-native'
import { IsoDie } from '../iso-die'

it('各出目で正しい数の目（ピップ）が描かれる', async () => {
	for (const value of [1, 2, 3, 4, 5, 6] as const) {
		const { getAllByTestId, getByTestId, unmount } = await render(
			<IsoDie value={value} size={64} />,
		)
		expect(getByTestId(`iso-die-${value}`)).toBeTruthy()
		expect(getAllByTestId('pip')).toHaveLength(value)
		await unmount()
	}
})

it('1の目は赤ピップになる', async () => {
	const { getByTestId } = await render(<IsoDie value={1} size={64} />)
	const fillProp = getByTestId('pip').props.fill
	let fillHex = fillProp
	if (typeof fillProp === 'object' && fillProp !== null && 'payload' in fillProp) {
		// jest-expo では color がオブジェクトで返される: {payload: number, type: number}
		// payload は ARGB 形式。下位24ビットが RGB
		const rgb = fillProp.payload & 0xffffff
		fillHex = `#${rgb.toString(16).padStart(6, '0').toUpperCase()}`
	}
	expect(fillHex).toBe('#C0392B')
})
