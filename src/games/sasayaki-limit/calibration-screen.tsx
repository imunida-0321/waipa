// 環境音を3秒サンプリングしてノイズフロア（中央値）を決める。居酒屋の騒音対策
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { CALIBRATION_MS, METER_INTERVAL_MS, median } from './engine'
import { SL } from './theme'

type Props = {
	levelDb: number
	onConfirm: (noiseFloorDb: number) => void
}

export function CalibrationScreen({ levelDb, onConfirm }: Props) {
	const levelRef = useRef(levelDb)
	useEffect(() => {
		levelRef.current = levelDb
	})
	const [floorDb, setFloorDb] = useState<number | null>(null)
	const [progress, setProgress] = useState(0)
	const [runId, setRunId] = useState(0)

	useEffect(() => {
		if (floorDb != null) return
		const samples: number[] = []
		const timer = setInterval(() => {
			samples.push(levelRef.current)
			setProgress(Math.min((samples.length * METER_INTERVAL_MS) / CALIBRATION_MS, 1))
			if (samples.length * METER_INTERVAL_MS >= CALIBRATION_MS) {
				clearInterval(timer)
				setFloorDb(median(samples))
			}
		}, METER_INTERVAL_MS)
		return () => clearInterval(timer)
	}, [floorDb, runId])

	const recalibrate = () => {
		setProgress(0)
		setFloorDb(null)
		setRunId((n) => n + 1)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>🎤 まわりの音をはかっています</Text>
			{floorDb == null ? (
				<>
					<Text style={styles.sub}>3秒間、しゃべらず静かにしてね</Text>
					<View style={styles.progressTrack}>
						<View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
					</View>
				</>
			) : (
				<>
					<Text style={styles.sub}>準備OK！この場の音を基準にゾーンを作りました</Text>
					<View style={styles.row}>
						<Pressable style={styles.subButton} onPress={recalibrate}>
							<Text style={styles.subButtonLabel}>再計測</Text>
						</Pressable>
						<Pressable style={styles.mainButton} onPress={() => onConfirm(floorDb)}>
							<Text style={styles.mainButtonLabel}>スタート</Text>
						</Pressable>
					</View>
				</>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
	title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
	sub: { color: SL.sub, fontSize: 14, textAlign: 'center' },
	progressTrack: {
		width: '80%',
		height: 10,
		borderRadius: 5,
		backgroundColor: SL.track,
		overflow: 'hidden',
	},
	progressFill: { height: '100%', backgroundColor: SL.green },
	row: { flexDirection: 'row', gap: 16 },
	subButton: {
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: SL.trackBorder,
	},
	subButtonLabel: { color: SL.sub, fontSize: 16, fontWeight: '600' },
	mainButton: {
		paddingHorizontal: 40,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: SL.green,
	},
	mainButtonLabel: { color: '#0B2818', fontSize: 16, fontWeight: '800' },
})
