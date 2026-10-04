import type { PropsWithChildren } from 'react'
import { render } from '@testing-library/react-native'
import { DiceCanvas, type DiceCanvasProps } from '../dice-canvas'

// GL・描画ループは起動せず、Canvas の子を残してシーンの描画分岐を検証する。
// native/web のどちらの r3f エントリを使っても同じモックになる。
jest.mock('@react-three/fiber', () => {
	const { createElement } = jest.requireActual<typeof import('react')>('react')
	const { View } = jest.requireActual<typeof import('react-native')>('react-native')
	const state = { gl: {}, scene: { environment: null } }
	return {
		Canvas: ({ children }: PropsWithChildren) =>
			createElement(View, { testID: 'mock-canvas' }, children),
		useFrame: jest.fn(),
		useThree: (selector: (value: typeof state) => unknown) => selector(state),
	}
})

jest.mock('@react-three/fiber/native', () => jest.requireMock('@react-three/fiber'))
jest.mock('expo-gl', () => ({ GLView: jest.fn(() => null) }))

// Vector3 / Quaternion の純粋計算は実物を使用し、GPU に依存する PMREM のみ置換。
jest.mock('three', () => ({
	...jest.requireActual<typeof import('three')>('three'),
	PMREMGenerator: jest.fn().mockImplementation(() => ({
		fromScene: jest.fn(() => ({ texture: { dispose: jest.fn() } })),
		dispose: jest.fn(),
	})),
}))

jest.mock('three/examples/jsm/geometries/RoundedBoxGeometry.js', () => ({
	RoundedBoxGeometry: jest.fn().mockImplementation(() => ({ dispose: jest.fn() })),
}))

jest.mock('three/examples/jsm/environments/RoomEnvironment.js', () => ({
	RoomEnvironment: jest.fn().mockImplementation(() => ({ dispose: jest.fn() })),
}))

// 段階②の契約: DiceCanvas(props: DiceCanvasProps)
// dice: readonly number[], rolling: boolean, rollId: number,
// backgroundColor: string, testID: string,
// shonben?: boolean (=false), ringColor?: string (省略時リングなし),
// durationMs?: number (=1200), height?: number (=260)
const baseProps: DiceCanvasProps = {
	dice: [2, 5],
	rolling: false,
	rollId: 137,
	backgroundColor: '#1B1030',
	testID: 'dice-roll-3d',
}

describe('DiceCanvas', () => {
	it.each([
		{ dice: [2, 5], testID: 'dice-roll-3d', rolling: false },
		{ dice: [1, 3, 6], testID: 'dice-3d', rolling: true },
	])('$testID: Canvas と指定個数のサイコロ本体・映り込みを描画する', async (props) => {
		const { getByTestId } = await render(<DiceCanvas {...baseProps} {...props} />)
		expect(getByTestId(props.testID)).toBeTruthy()
		const canvas = getByTestId('mock-canvas')
		expect(canvas).toBeTruthy()
		expect(canvas.queryAll((node) => node.type === 'meshPhysicalMaterial')).toHaveLength(
			props.dice.length * 2,
		)
		expect(
			canvas.queryAll((node) => node.type === 'mesh' && node.props.castShadow === true),
		).toHaveLength(props.dice.length)
	})

	it('ringColor 省略時は丼リングを描画しない', async () => {
		const { getByTestId } = await render(<DiceCanvas {...baseProps} />)
		expect(
			getByTestId('mock-canvas').queryAll((node) => node.type === 'torusGeometry'),
		).toHaveLength(0)
	})

	it('ringColor でリングを表示し、色の更新・省略を再レンダーに反映する', async () => {
		const { getByTestId, rerender } = await render(
			<DiceCanvas {...baseProps} ringColor="#8A8264" />,
		)
		for (const color of ['#8A8264', '#12ABCD']) {
			await rerender(<DiceCanvas {...baseProps} ringColor={color} />)
			const rings = getByTestId('mock-canvas').queryAll(
				(node) => node.type === 'torusGeometry',
			)
			expect(rings).toHaveLength(1)
			const materials = rings[0].parent?.queryAll(
				(node) => node.type === 'meshStandardMaterial',
			)
			expect(materials).toHaveLength(1)
			expect(materials?.[0].props.color).toBe(color)
		}
		await rerender(<DiceCanvas {...baseProps} />)
		expect(
			getByTestId('mock-canvas').queryAll((node) => node.type === 'torusGeometry'),
		).toHaveLength(0)
	})

	it('backgroundColor の変更を背景と鏡面床の両方へ反映する', async () => {
		const { getByTestId, rerender } = await render(<DiceCanvas {...baseProps} />)
		for (const backgroundColor of ['#1B1030', '#123456']) {
			await rerender(<DiceCanvas {...baseProps} backgroundColor={backgroundColor} />)
			const canvas = getByTestId('mock-canvas')
			const backgrounds = canvas.queryAll(
				(node) => node.type === 'color' && node.props.attach === 'background',
			)
			expect(backgrounds).toHaveLength(1)
			expect(backgrounds[0].props.args).toEqual([backgroundColor])
			const floors = canvas.queryAll(
				(node) => node.type === 'mesh' && node.props.renderOrder === 1,
			)
			expect(floors).toHaveLength(1)
			const materials = floors[0].queryAll((node) => node.type === 'meshStandardMaterial')
			expect(materials).toHaveLength(1)
			expect(materials[0].props.color).toBe(backgroundColor)
		}
	})
})
