import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { RP } from './theme'

export const ROLL_MS = 2000
export const PASS_PAUSE_MS = 1200
export const REROLL_MS = 1200
export const LANDED_MS = 900
export const TICK_MS = 90

type Props = {
	names: string[]
	firstIndex: number
	finalIndex: number
	passConsumed: boolean
	onDone: () => void
}

type Step = 'rolling' | 'passPause' | 'rerolling' | 'landed'

// ペア成立時の「誰が罰？」全員ルーレット。firstIndex/finalIndex は reducer 側で確定済みで、
// このコンポーネントは演出（ハイライト送り→停止）だけを担当する
export function PlayerRoulette({ names, firstIndex, finalIndex, passConsumed, onDone }: Props) {
	const [step, setStep] = useState<Step>('rolling')
	const [highlight, setHighlight] = useState(0)
	const tick = useRef<ReturnType<typeof setInterval> | null>(null)
	const onDoneRef = useRef(onDone)
	onDoneRef.current = onDone

	// step ごとにタイマーを張り替える単純な状態機械
	useEffect(() => {
		const stopTick = () => {
			if (tick.current) clearInterval(tick.current)
			tick.current = null
		}
		if (step === 'rolling' || step === 'rerolling') {
			if (step === 'rolling') playSound('drumroll')
			tick.current = setInterval(() => {
				setHighlight((h) => (h + 1) % names.length)
			}, TICK_MS)
			const t = setTimeout(
				() => {
					stopTick()
					if (step === 'rolling' && passConsumed) {
						setHighlight(firstIndex)
						setStep('passPause')
					} else {
						setHighlight(finalIndex)
						haptics.heavy()
						playSound('reveal')
						setStep('landed')
					}
				},
				step === 'rolling' ? ROLL_MS : REROLL_MS,
			)
			return () => {
				stopTick()
				clearTimeout(t)
			}
		}
		if (step === 'passPause') {
			const t = setTimeout(() => setStep('rerolling'), PASS_PAUSE_MS)
			return () => clearTimeout(t)
		}
		// landed
		const t = setTimeout(() => onDoneRef.current(), LANDED_MS)
		return () => clearTimeout(t)
	}, [step, names.length, firstIndex, finalIndex, passConsumed])

	return (
		<View style={styles.backdrop}>
			<Text style={styles.title}>
				{step === 'passPause' ? '🍀 免除パス発動！' : '誰が罰ゲーム！？'}
			</Text>
			<View style={styles.list}>
				{names.map((name, i) => (
					<View
						key={`${i}-${name}`}
						style={[
							styles.row,
							i === highlight && {
								backgroundColor: playerColor(i).value,
								borderColor: playerColor(i).value,
							},
						]}
					>
						<Text style={[styles.name, i === highlight && styles.nameActive]}>
							{name}
						</Text>
					</View>
				))}
			</View>
			{step === 'landed' && <Text style={styles.landed}>{names[finalIndex]}さん！</Text>}
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10,8,24,0.94)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.md,
	},
	title: { ...typography.title, color: RP.green },
	list: { alignSelf: 'stretch', gap: spacing.xs },
	row: {
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.sm,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		backgroundColor: colors.surface,
	},
	name: { ...typography.body, textAlign: 'center' },
	nameActive: { fontWeight: '800' },
	landed: { ...typography.hero, color: RP.lucky },
})
