import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { radii, spacing, typography } from '@/theme/tokens'
import type { Declaration } from './engine'
import { OP } from './theme'

export const LONG_PRESS_MS = 600

type Props = {
	playerName: string
	onDeclare: (choice: Declaration) => void
}

// 宣言フェーズ（1人分）: handoff → 長押しで秘密宣言。確定した瞬間に親が次の人の
// handoff（＝中立画面）へ切り替えるので、宣言内容は結果発表まで誰にも見えない。
// 呼び出し側で key={turnIndex} を付けてプレイヤーごとに新規マウントする前提
export function DeclareScreen({ playerName, onDeclare }: Props) {
	const [step, setStep] = useState<'handoff' | 'choose'>('handoff')

	const confirm = (choice: Declaration) => {
		haptics.heavy()
		onDeclare(choice)
	}

	if (step === 'handoff') {
		return (
			<View style={styles.body}>
				<Text style={styles.turn}>📲 {playerName}さんにスマホを渡して</Text>
				<Text style={styles.hint}>宣言はまわりに見せないでね</Text>
				<GradientButton title="受け取った！" onPress={() => setStep('choose')} />
			</View>
		)
	}

	return (
		<View style={styles.body}>
			<Text style={styles.turn}>{playerName}さんの宣言</Text>
			<Text style={styles.hint}>どちらかを長押しで確定！（確定したら即、次の人へ）</Text>
			<Pressable
				accessibilityRole="button"
				delayLongPress={LONG_PRESS_MS}
				onLongPress={() => confirm('fight')}
				style={({ pressed }) => [styles.choice, styles.fight, pressed && styles.pressed]}
			>
				<Text style={styles.choiceText}>🔥 勝負</Text>
			</Pressable>
			<Pressable
				accessibilityRole="button"
				delayLongPress={LONG_PRESS_MS}
				onLongPress={() => confirm('fold')}
				style={({ pressed }) => [styles.choice, styles.fold, pressed && styles.pressed]}
			>
				<Text style={styles.choiceText}>🏳️ 降りる</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	body: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.md },
	turn: { ...typography.title, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center' },
	choice: {
		minHeight: 96,
		borderRadius: radii.lg,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fight: { borderColor: OP.fight, backgroundColor: `${OP.fight}22` },
	fold: { borderColor: OP.fold, backgroundColor: `${OP.fold}22` },
	pressed: { opacity: 0.6 },
	choiceText: { ...typography.hero },
})
