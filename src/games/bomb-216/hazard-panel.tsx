import type { PropsWithChildren } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Polygon, Rect } from 'react-native-svg'
import { BOMB } from './theme'

const STRIPE_H = 26
const STRIPE_VIEW_W = 400
const STRIPE_STEP = 40

// 斜めストライプの警告バー（上下共通）。幅は viewBox スケールで追従
function HazardStripes() {
	const polys = []
	for (let x = -STRIPE_H; x < STRIPE_VIEW_W + STRIPE_H; x += STRIPE_STEP) {
		polys.push(
			<Polygon
				key={x}
				points={`${x},${STRIPE_H} ${x + STRIPE_H},0 ${x + STRIPE_H + STRIPE_STEP / 2},0 ${x + STRIPE_STEP / 2},${STRIPE_H}`}
				fill={BOMB.stripeDark}
			/>,
		)
	}
	return (
		// absoluteFill のテクスチャ層より前面に出すため zIndex 付き View で包む（Web 対策）
		<View style={styles.stripeWrap}>
			<Svg
				width="100%"
				height={STRIPE_H}
				viewBox={`0 0 ${STRIPE_VIEW_W} ${STRIPE_H}`}
				preserveAspectRatio="xMidYMid slice"
			>
				<Rect
					x={0}
					y={0}
					width={STRIPE_VIEW_W}
					height={STRIPE_H}
					fill={BOMB.stripeYellow}
				/>
				{polys}
			</Svg>
		</View>
	)
}

// サビた黄色の警告パネル。質感は assets/images/bomb/rust.png を重ねる
// （本番テクスチャは同名上書きで差し替え）
export function HazardPanel({ children }: PropsWithChildren) {
	return (
		<View style={styles.panel} testID="hazard-panel">
			<LinearGradient
				colors={[BOMB.panelLight, BOMB.panelDark]}
				style={StyleSheet.absoluteFill}
			/>
			<Image
				source={require('@/assets/images/bomb/rust.png')}
				style={[StyleSheet.absoluteFill, styles.rust]}
				resizeMode="repeat"
			/>
			<HazardStripes />
			<View style={styles.body}>{children}</View>
			<HazardStripes />
		</View>
	)
}

const styles = StyleSheet.create({
	panel: {
		borderRadius: 14,
		borderWidth: 3,
		borderColor: BOMB.panelBorder,
		overflow: 'hidden',
	},
	rust: { opacity: 0.4 },
	stripeWrap: { zIndex: 1 },
	body: { paddingHorizontal: 8, paddingVertical: 10 },
})
