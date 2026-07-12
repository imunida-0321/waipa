import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { WW } from './theme'

type Props = {
	dealIndex: number // 0起点
	playerCount: number
	name: string // いま確認する人の表示名
	word: string // その人に配られたお題（多数派 or ウルフ）
	onConfirm: () => void
}

// 端末回しのお題確認。お題は長押し中のみ表示（覗き見防止）。
// 一度でも表示したら「確認した」で次の人へ渡せる
export function DealPass({ dealIndex, playerCount, name, word, onConfirm }: Props) {
	const [pressing, setPressing] = useState(false)
	const [viewed, setViewed] = useState(false)

	return (
		<View style={styles.container}>
			<Text style={styles.step}>
				お題くばり（{dealIndex + 1}/{playerCount}）
			</Text>
			<Text style={styles.instruction}>{name}さんにスマホを渡してください</Text>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="長押しで自分のお題を表示"
				onPressIn={() => {
					haptics.tap()
					setPressing(true)
					setViewed(true)
				}}
				onPressOut={() => setPressing(false)}
				style={[styles.wordPad, pressing && styles.wordPadActive]}
			>
				{pressing ? (
					<>
						<Text style={styles.wordLabel}>あなたのお題</Text>
						<Text style={styles.word}>{word}</Text>
					</>
				) : (
					<>
						<Text style={styles.holdEmoji}>🤫</Text>
						<Text style={styles.holdText}>長押しで自分のお題を表示</Text>
					</>
				)}
			</Pressable>

			<GradientButton
				title={
					dealIndex + 1 < playerCount
						? '確認した（次の人へ）'
						: '確認した（議論スタート！）'
				}
				onPress={onConfirm}
				disabled={!viewed || pressing}
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
	step: { ...typography.caption, textAlign: 'center', color: WW.wolf },
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
	wordPadActive: { borderColor: WW.wolf },
	wordLabel: { ...typography.caption },
	word: { ...typography.hero, fontSize: 40, color: WW.wolf, textAlign: 'center' },
	holdEmoji: { fontSize: 40 },
	holdText: { ...typography.caption },
})
