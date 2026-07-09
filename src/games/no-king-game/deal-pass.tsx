import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { NKG } from './theme'

type Props = {
	round: number
	dealIndex: number // 0起点
	playerCount: number
	number: number // いま確認する人の番号
	onConfirm: () => void
}

// 端末回しの番号確認。番号は長押し中のみ表示（覗き見防止）。
// 一度でも表示したら「確認した」で次の人へ渡せる
export function DealPass({ round, dealIndex, playerCount, number, onConfirm }: Props) {
	const [pressing, setPressing] = useState(false)
	const [viewed, setViewed] = useState(false)

	return (
		<View style={styles.container}>
			<Text style={styles.round}>ROUND {round}</Text>
			<Text style={styles.instruction}>
				{dealIndex + 1}人目の人にスマホを渡してください（{dealIndex + 1}/{playerCount}）
			</Text>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="長押しで自分の番号を表示"
				onPressIn={() => {
					haptics.tap()
					setPressing(true)
					setViewed(true)
				}}
				onPressOut={() => setPressing(false)}
				style={[styles.numberPad, pressing && styles.numberPadActive]}
			>
				{pressing ? (
					<Text style={styles.number}>{number}番</Text>
				) : (
					<>
						<Text style={styles.holdEmoji}>🤫</Text>
						<Text style={styles.holdText}>長押しで自分の番号を表示</Text>
					</>
				)}
			</Pressable>

			<GradientButton
				title={
					dealIndex + 1 < playerCount ? '確認した（次の人へ）' : '確認した（発表へ！）'
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
	round: { ...typography.caption, textAlign: 'center', color: colors.gold },
	instruction: { ...typography.body, textAlign: 'center' },
	numberPad: {
		minHeight: 200,
		borderRadius: radii.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
	},
	numberPadActive: { borderColor: NKG.crown },
	number: { ...typography.hero, fontSize: 64, color: NKG.crown },
	holdEmoji: { fontSize: 40 },
	holdText: { ...typography.caption },
})
