import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { METER_INTERVAL_MS, type Zone } from './engine'
import { SL } from './theme'

type Props = {
	// 0..1 正規化済みの現在音量
	level: number
	// 0..1 のピーク残留マーカー（未計測は null）
	peak: number | null
	zone: Zone
	active: boolean
}

export function VolumeGauge({ level, peak, zone, active }: Props) {
	const fill = useSharedValue(0)
	useEffect(() => {
		fill.value = withTiming(active ? level : 0, { duration: METER_INTERVAL_MS })
	}, [level, active, fill])

	const fillStyle = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }))
	const inZone = active && level >= zone.low && level <= zone.high
	const barColor = inZone ? SL.green : level > zone.high ? SL.red : SL.blue

	return (
		<View style={styles.track} testID="volume-gauge">
			<View
				style={[
					styles.zoneBand,
					{ bottom: `${zone.low * 100}%`, height: `${(zone.high - zone.low) * 100}%` },
					inZone && styles.zoneGlow,
				]}
				testID="zone-band"
			/>
			<Animated.View style={[styles.fill, fillStyle, { backgroundColor: barColor }]} />
			{peak != null && (
				<View
					style={[styles.peakMarker, { bottom: `${peak * 100}%` }]}
					testID="peak-marker"
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	track: {
		width: 72,
		height: 320,
		borderRadius: 16,
		backgroundColor: SL.track,
		borderWidth: 1,
		borderColor: SL.trackBorder,
		overflow: 'hidden',
		justifyContent: 'flex-end',
	},
	fill: {
		width: '100%',
		borderTopLeftRadius: 6,
		borderTopRightRadius: 6,
	},
	zoneBand: {
		position: 'absolute',
		left: 0,
		right: 0,
		backgroundColor: 'rgba(61, 220, 132, 0.22)',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: SL.green,
	},
	zoneGlow: {
		backgroundColor: 'rgba(61, 220, 132, 0.45)',
		shadowColor: SL.greenGlow,
		shadowOpacity: 0.9,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 0 },
		elevation: 8,
	},
	peakMarker: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 3,
		backgroundColor: '#FFFFFF',
	},
})
