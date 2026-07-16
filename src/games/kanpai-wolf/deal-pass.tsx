import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { KW } from './theme'

type Props = {
	dealIndex: number // 0起点
	playerCount: number
	name: string // いま確認する人の表示名
	word: string // その人に配られたお題（多数派 or ウルフ）
	onConfirm: () => void
}

// 端末回しのお題確認。お題はタップで表示/非表示を切り替える（覗き見防止）。
// 一度でも表示し、非表示に戻したら「確認した」で次の人へ渡せる
export function DealPass({ dealIndex, playerCount, name, word, onConfirm }: Props) {
	const [revealed, setRevealed] = useState(false)
	const [viewed, setViewed] = useState(false)

	return (
		<View style={styles.container}>
			<Text style={styles.step}>
				お題くばり（{dealIndex + 1}/{playerCount}）
			</Text>
			<Text style={styles.instruction}>{name}さんにスマホを渡してください</Text>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="タップで自分のお題を表示"
				onPress={() => {
					haptics.tap()
					if (!revealed) setViewed(true)
					setRevealed(!revealed)
				}}
				style={[styles.wordPad, revealed && styles.wordPadActive]}
			>
				{revealed ? (
					<>
						<Text style={styles.wordLabel}>あなたのお題</Text>
						<Text style={styles.word}>{word}</Text>
						<Text style={styles.hint}>タップで隠す</Text>
					</>
				) : (
					<Text style={styles.holdText}>タップで自分のお題を表示</Text>
				)}
			</Pressable>

			<GradientButton
				title={
					dealIndex + 1 < playerCount
						? '確認した（次の人へ）'
						: '確認した（乾杯ルールへ！）'
				}
				onPress={onConfirm}
				disabled={!viewed || revealed}
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
	step: { ...typography.caption, textAlign: 'center', color: KW.wolf },
	instruction: { ...typography.body, textAlign: 'center' },
	wordPad: {
		minHeight: 200,
		borderRadius: radii.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
	},
	wordPadActive: { borderColor: KW.wolf },
	wordLabel: { ...typography.caption },
	word: { ...typography.hero, fontSize: 40, color: KW.wolf, textAlign: 'center' },
	holdText: { ...typography.caption },
	hint: { ...typography.caption, fontSize: 12 },
})
