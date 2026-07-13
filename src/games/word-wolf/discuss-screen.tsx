import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { colors, spacing, typography } from '@/theme/tokens'
import { WW } from './theme'

type Props = {
	seconds: number
	isRunoff?: boolean // 決選投票前の再議論
	onDone: () => void
}

// 議論タイマー。残り10秒からチクタク（残り5秒からは半拍追加で加速感）。
// 満了 or「投票へすすむ」2度押しで onDone
export function DiscussScreen({ seconds, isRunoff = false, onDone }: Props) {
	const [remaining, setRemaining] = useState(seconds)
	const [confirming, setConfirming] = useState(false)
	const doneRef = useRef(false)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const halfRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const finish = () => {
		if (doneRef.current) return
		doneRef.current = true
		if (intervalRef.current) clearInterval(intervalRef.current)
		if (halfRef.current) clearTimeout(halfRef.current)
		haptics.heavy()
		onDone()
	}

	useEffect(() => {
		intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000)
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current)
		}
	}, [])

	useEffect(() => {
		if (doneRef.current) return
		if (remaining <= 0) {
			finish()
			return
		}
		if (remaining <= 10) {
			playSound('tick') // 素材未登録の間は無音スキップ（#75）
			haptics.tap()
			if (remaining <= 5) {
				halfRef.current = setTimeout(() => playSound('tick'), 500)
				return () => {
					if (halfRef.current) clearTimeout(halfRef.current)
				}
			}
		}
		// remaining のカウントダウンごとに評価する
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [remaining])

	const mm = Math.floor(Math.max(remaining, 0) / 60)
	const ss = String(Math.max(remaining, 0) % 60).padStart(2, '0')

	return (
		<View style={styles.container}>
			<Text style={styles.title}>
				{isRunoff ? '🗳️ 決選投票の前に、もう一度話し合おう' : '💬 議論タイム！'}
			</Text>
			<Text style={styles.hint}>
				{isRunoff
					? '同票だった人たちに質問して、ウルフを見極めよう'
					: 'お互いに質問して、ひとりだけ違う人を探そう'}
			</Text>
			<Text style={[styles.timer, remaining <= 10 && styles.timerUrgent]}>
				{mm}:{ss}
			</Text>
			<GradientButton
				title={confirming ? 'もう一度タップで投票へ！' : '投票へすすむ'}
				onPress={() => {
					if (confirming) finish()
					else setConfirming(true)
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	title: { ...typography.body, textAlign: 'center', fontWeight: '700' },
	hint: { ...typography.caption, textAlign: 'center' },
	timer: { ...typography.hero, fontSize: 72, textAlign: 'center', color: colors.text },
	timerUrgent: { color: WW.danger },
})
