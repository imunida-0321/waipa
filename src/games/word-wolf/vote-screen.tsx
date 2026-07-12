import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { WW } from './theme'

type Props = {
	voterIndex: number
	voterName: string
	names: string[]
	candidates: number[] | null // 決選投票の候補。null なら全員
	onVote: (target: number) => void
}

// 1台回し投票。ハンドオーバー → 選択 → 確定で即 onVote（親が key 再マウントで次の人へ＝秘匿）
export function VoteScreen({ voterIndex, voterName, names, candidates, onVote }: Props) {
	const [stage, setStage] = useState<'handover' | 'choose'>('handover')
	const [selected, setSelected] = useState<number | null>(null)

	const targets = (candidates ?? names.map((_, i) => i)).filter((i) => i !== voterIndex)

	if (stage === 'handover') {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>🗳️ 投票タイム</Text>
				<Text style={styles.instruction}>{voterName}さんにスマホを渡してください</Text>
				<GradientButton
					title="投票する"
					onPress={() => {
						haptics.tap()
						setStage('choose')
					}}
				/>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>🐺 誰がウルフだと思う？</Text>
			<ScrollView contentContainerStyle={styles.list}>
				{targets.map((i) => {
					const color = playerColor(i).value
					return (
						<Pressable
							key={i}
							accessibilityRole="button"
							accessibilityState={{ selected: selected === i }}
							onPress={() => {
								haptics.tap()
								setSelected(i)
							}}
							style={[styles.row, selected === i && styles.rowSelected]}
						>
							<View style={[styles.colorBar, { backgroundColor: color }]} />
							<Text style={styles.name}>{names[i]}</Text>
						</Pressable>
					)
				})}
			</ScrollView>
			<GradientButton
				title="この人に投票（確定）"
				onPress={() => {
					if (selected !== null) onVote(selected)
				}}
				disabled={selected === null}
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
	instruction: { ...typography.body, textAlign: 'center' },
	list: { gap: spacing.sm },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.md,
		padding: spacing.md,
		borderRadius: radii.md,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
	},
	rowSelected: { borderColor: WW.wolf },
	colorBar: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
	name: { ...typography.body },
})
