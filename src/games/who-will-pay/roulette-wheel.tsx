import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg'
import { WWP } from './theme'
import { wheelRepeats } from './spin'

type Props = {
	playerColors: string[]
	rotation: SharedValue<number>
	size: number
}

function sectorPath(cx: number, cy: number, r: number, start: number, end: number): string {
	const toXY = (deg: number) => {
		const rad = ((deg - 90) * Math.PI) / 180 // 真上を0に
		return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
	}
	const [x1, y1] = toXY(start)
	const [x2, y2] = toXY(end)
	const large = end - start > 180 ? 1 : 0
	return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

export function RouletteWheel({ playerColors, rotation, size }: Props) {
	const r = size / 2
	const total = playerColors.length * wheelRepeats(playerColors.length)
	const sector = 360 / total
	const style = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${rotation.value}deg` }] }))

	return (
		<View style={{ width: size, height: size, alignItems: 'center' }}>
			<Animated.View style={[StyleSheet.absoluteFill, style]}>
				<Svg width={size} height={size}>
					<G>
						{Array.from({ length: total }, (_, i) => (
							<Path
								key={i}
								d={sectorPath(r, r, r - 6, i * sector, (i + 1) * sector)}
								fill={playerColors[i % playerColors.length]}
								stroke={WWP.bg}
								strokeWidth={2}
							/>
						))}
						<Circle
							cx={r}
							cy={r}
							r={r - 4}
							fill="none"
							stroke={WWP.rim}
							strokeWidth={8}
						/>
						<Circle cx={r} cy={r} r={14} fill={WWP.pointer} />
					</G>
				</Svg>
			</Animated.View>
			{/* 上部固定ポインタ */}
			<Svg width={24} height={20} style={{ position: 'absolute', top: -4 }}>
				<Polygon points="12,20 0,0 24,0" fill={WWP.pointer} />
			</Svg>
		</View>
	)
}
