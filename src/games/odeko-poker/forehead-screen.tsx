import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { OP } from './theme'

export const PREP_SECONDS = 3
export const SHOW_SECONDS = 5

type Step = 'handoff' | 'countdown' | 'showing'

type Props = {
	playerName: string
	playerColor: string
	card: number
	onDone: () => void
}

// 額当て確認フェーズ（1人分）: handoff → 覗き見防止カウントダウン3秒 → カード大表示5秒 → onDone
// 呼び出し側で key={turnIndex} を付けてプレイヤーごとに新規マウントする前提
export function ForeheadScreen({ playerName, playerColor, card, onDone }: Props) {
	const [step, setStep] = useState<Step>('handoff')
	const [seconds, setSeconds] = useState(PREP_SECONDS)

	useEffect(() => {
		if (step === 'handoff') return
		const t = setInterval(() => setSeconds((s) => s - 1), 1000)
		return () => clearInterval(t)
	}, [step])

	useEffect(() => {
		if (seconds > 0) return
		if (step === 'countdown') {
			playSound('reveal')
			setStep('showing')
			setSeconds(SHOW_SECONDS)
		} else if (step === 'showing') {
			onDone()
		}
	}, [seconds, step, onDone])

	if (step === 'handoff') {
		return (
			<View style={styles.body}>
				<Text style={styles.turn}>📲 {playerName}さんにスマホを渡して</Text>
				<Text style={styles.hint}>
					下のボタンをタップして受け取ってね！{'\n'}
					カウントダウン中に画面を外向きにして額に当ててね
				</Text>
				<GradientButton
					title="受け取った！額当て準備"
					onPress={() => {
						haptics.tap()
						setSeconds(PREP_SECONDS)
						setStep('countdown')
					}}
				/>
			</View>
		)
	}

	if (step === 'countdown') {
		return (
			<View style={styles.body}>
				<Text style={styles.hint}>画面を外向きにして額に当てて！</Text>
				<Text style={styles.countdown} testID="prep-countdown">
					{seconds}
				</Text>
			</View>
		)
	}

	return (
		<View style={styles.body} testID="card-face">
			<Text style={styles.hint}>みんなは {playerName}さんのカードを覚えて！</Text>
			<View style={[styles.card, { borderColor: playerColor }]}>
				<Text style={styles.cardValue}>{card}</Text>
			</View>
			<Text style={styles.remaining}>あと{seconds}秒</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
	turn: { ...typography.title, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center', lineHeight: 20 },
	countdown: { ...typography.hero, fontSize: 96 },
	card: {
		width: 200,
		height: 280,
		borderRadius: radii.lg,
		borderWidth: 6,
		backgroundColor: OP.cardFace,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardValue: { fontSize: 120, fontWeight: '800', color: OP.cardText },
	remaining: { ...typography.body, color: colors.textMuted },
})
