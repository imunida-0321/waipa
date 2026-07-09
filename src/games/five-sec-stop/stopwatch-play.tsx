import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { formatDeviation, formatSeconds, tierOf } from './judge'
import { PittariBurst } from './pittari-burst'
import { FSS } from './theme'
import { HIDE_END_MS, HIDE_START_MS, useStopwatch } from './use-stopwatch'

type Props = {
	playerIndex: number
	playerName: string
	orderLabel: string
	doneLabel: string
	onDone: (ms: number) => void
}

type Phase = 'standby' | 'measuring' | 'record'

// 1人分の計測: スタンバイ → 計測（3秒から数字が消える）→ 記録ドン！
export function StopwatchPlay({ playerIndex, playerName, orderLabel, doneLabel, onDone }: Props) {
	const [phase, setPhase] = useState<Phase>('standby')
	const [recordMs, setRecordMs] = useState(0)
	const sw = useStopwatch()

	const color = playerColor(playerIndex).value

	const handleStart = () => {
		playSound('tap')
		sw.start()
		setPhase('measuring')
	}

	const handleStop = () => {
		const ms = sw.stop()
		if (ms === null) return // 誤爆ガード
		playSound('tap')
		const tier = tierOf(ms)
		if (tier === 'pittari') {
			haptics.success()
			playSound('reveal')
		} else {
			haptics.heavy()
		}
		setRecordMs(ms)
		setPhase('record')
	}

	if (phase === 'standby') {
		return (
			<View style={styles.container}>
				<Text style={styles.orderLabel}>{orderLabel}</Text>
				<View style={styles.nameRow}>
					<View style={[styles.colorDot, { backgroundColor: color }]} />
					<Text style={styles.name}>{playerName} さんの番</Text>
				</View>
				<Text style={styles.hint}>5.00秒ぴったりを狙ってストップ！</Text>
				<View style={styles.actions}>
					<GradientButton title="タップでスタート" onPress={handleStart} />
				</View>
			</View>
		)
	}

	if (phase === 'measuring') {
		// 2.5〜3.0秒で数字がフェードアウトし、以降は「？？？」（DrumrollReveal の rolling 演出を流用）
		const hidden = sw.displayMs >= HIDE_END_MS
		const opacity = hidden
			? 0
			: Math.min(1, (HIDE_END_MS - sw.displayMs) / (HIDE_END_MS - HIDE_START_MS))
		return (
			<Pressable
				testID="stop-area"
				accessibilityRole="button"
				style={styles.container}
				onPress={handleStop}
			>
				<Text style={styles.orderLabel}>{orderLabel}</Text>
				<Text style={styles.nameCaption}>{playerName} さんの番</Text>
				<View style={styles.timerArea}>
					{hidden ? (
						<DrumrollReveal phase="rolling" lottie={false} />
					) : (
						<Text testID="timer-digits" style={[styles.digits, { opacity }]}>
							{formatSeconds(sw.displayMs)}
						</Text>
					)}
				</View>
				<View style={styles.stopGuide}>
					<Text style={styles.stopGuideText}>画面のどこでもタップでストップ！</Text>
				</View>
			</Pressable>
		)
	}

	const tier = tierOf(recordMs)
	const tierColor = FSS.tierColors[tier]
	const pittari = tier === 'pittari'

	return (
		<View style={styles.container}>
			{pittari && <PittariBurst />}
			<Text style={styles.orderLabel}>{playerName} さんの記録</Text>
			{pittari && <Text style={styles.pittariTitle}>＼ ぴったり賞 ／</Text>}
			<View style={styles.timerArea}>
				<DrumrollReveal phase="revealed" lottie={false}>
					<View style={styles.recordBlock}>
						<Text style={[styles.digits, { color: tierColor }]}>
							{formatSeconds(recordMs)}
						</Text>
						<Text style={[styles.deviation, { color: tierColor }]}>
							{formatDeviation(recordMs)} ズレ
						</Text>
					</View>
				</DrumrollReveal>
			</View>
			<View style={styles.actions}>
				<GradientButton title={doneLabel} onPress={() => onDone(recordMs)} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: FSS.bg,
		padding: spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	orderLabel: {
		...typography.caption,
		marginBottom: spacing.sm,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	colorDot: {
		width: 14,
		height: 14,
		borderRadius: radii.pill,
	},
	name: {
		...typography.title,
	},
	nameCaption: {
		...typography.body,
		marginBottom: spacing.md,
	},
	hint: {
		...typography.body,
		color: colors.textMuted,
		marginBottom: spacing.xl,
	},
	timerArea: {
		minHeight: 140,
		justifyContent: 'center',
		alignItems: 'center',
		alignSelf: 'stretch',
	},
	digits: {
		...typography.hero,
		fontSize: 72,
		fontVariant: ['tabular-nums'],
		color: FSS.accent,
	},
	recordBlock: {
		alignItems: 'center',
	},
	deviation: {
		...typography.title,
		marginTop: spacing.sm,
	},
	pittariTitle: {
		...typography.title,
		color: colors.gold,
		letterSpacing: 2,
	},
	stopGuide: {
		position: 'absolute',
		bottom: spacing.xl,
		left: spacing.lg,
		right: spacing.lg,
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: FSS.accent,
		borderRadius: radii.md,
		padding: spacing.md,
		alignItems: 'center',
	},
	stopGuideText: {
		...typography.body,
		color: FSS.accent,
	},
	actions: {
		alignSelf: 'stretch',
		marginTop: spacing.xl,
	},
})
