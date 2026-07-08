import { StyleSheet, View, useWindowDimensions } from 'react-native'
import Svg, { Line } from 'react-native-svg'

const STEP = 46

// 画面手前に重ねる金網（ダイヤ格子）。タップは透過
export function FenceOverlay() {
	const { width, height } = useWindowDimensions()
	const lines = []
	for (let x = -height; x < width; x += STEP) {
		lines.push(
			<Line
				key={`a${x}`}
				x1={x}
				y1={0}
				x2={x + height}
				y2={height}
				stroke="#59616C"
				strokeWidth={1.8}
			/>,
			<Line
				key={`b${x}`}
				x1={x + height}
				y1={0}
				x2={x}
				y2={height}
				stroke="#343A43"
				strokeWidth={1.8}
			/>,
		)
	}
	return (
		<View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, styles.wrap]}
			testID="fence-overlay"
		>
			<Svg width={width} height={height}>
				{lines}
			</Svg>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { opacity: 0.35 },
})
