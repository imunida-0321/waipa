import { View } from 'react-native'
import Svg, { Ellipse, Polygon } from 'react-native-svg'
import { CHIN } from './theme'

type Props = {
	value: 1 | 2 | 3 | 4 | 5 | 6
	size: number
	/** 傾き（度）。丼の中で散らばって見せる用 */
	tilt?: number
}

// 上面の目の配置（菱形グリッド上の u,v 座標。0..1）
const PIP_LAYOUT: Record<number, [number, number][]> = {
	1: [[0.5, 0.5]],
	2: [
		[0.3, 0.3],
		[0.7, 0.7],
	],
	3: [
		[0.25, 0.25],
		[0.5, 0.5],
		[0.75, 0.75],
	],
	4: [
		[0.3, 0.3],
		[0.7, 0.3],
		[0.3, 0.7],
		[0.7, 0.7],
	],
	5: [
		[0.28, 0.28],
		[0.72, 0.28],
		[0.5, 0.5],
		[0.28, 0.72],
		[0.72, 0.72],
	],
	6: [
		[0.28, 0.22],
		[0.28, 0.5],
		[0.28, 0.78],
		[0.72, 0.22],
		[0.72, 0.5],
		[0.72, 0.78],
	],
}

// 等角投影の立方体。上面菱形: N(50,20) E(85,37.5) S(50,55) W(15,37.5)
// 上面上の点: P(u,v) = (50 + 35u - 35v, 20 + 17.5u + 17.5v)
export function IsoDie({ value, size, tilt = 0 }: Props) {
	const pips = PIP_LAYOUT[value]
	const pipColor = value === 1 ? CHIN.pipRed : CHIN.pip

	return (
		<View
			testID={`iso-die-${value}`}
			style={{ width: size, height: size * 1.1, transform: [{ rotate: `${tilt}deg` }] }}
		>
			<Svg width={size} height={size * 1.1} viewBox="0 0 100 100">
				<Polygon
					points="50,20 85,37.5 50,55 15,37.5"
					fill={CHIN.dieFace}
					stroke={CHIN.pip}
					strokeWidth={1}
				/>
				<Polygon
					points="15,37.5 50,55 50,95 15,77.5"
					fill={CHIN.dieSideL}
					stroke={CHIN.pip}
					strokeWidth={1}
				/>
				<Polygon
					points="50,55 85,37.5 85,77.5 50,95"
					fill={CHIN.dieSideR}
					stroke={CHIN.pip}
					strokeWidth={1}
				/>
				{pips.map(([u, v], i) => (
					<Ellipse
						key={i}
						testID="pip"
						cx={50 + 35 * u - 35 * v}
						cy={20 + 17.5 * u + 17.5 * v}
						rx={3.4}
						ry={2}
						fill={pipColor}
					/>
				))}
			</Svg>
		</View>
	)
}
