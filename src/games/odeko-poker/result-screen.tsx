import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GradientButton } from '@/components/ui/gradient-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import type { Declaration, Judgement } from './engine'
import { OP } from './theme'

type Props = {
	names: string[]
	cards: number[]
	declarations: Declaration[]
	judgement: Judgement
	onNextRound: () => void
	onHome: () => void
}

function banner(judgement: Judgement, names: string[]): string {
	if (judgement.outcome === 'all-fold') return '全員降り！全員負け！🍻'
	if (judgement.outcome === 'solo-fight')
		return `${names[judgement.winnerIndex ?? 0]}さんの一人勝ち！🎉`
	return `${names[judgement.loserIndices[0]]}さんの負け！💀`
}

// ドラムロール → 全カード＋全宣言の一斉公開 → 敗者・一人勝ち・全員負け＋ヘタレ賞の発表
export function ResultScreen({
	names,
	cards,
	declarations,
	judgement,
	onNextRound,
	onHome,
}: Props) {
	const { phase, start } = useDrumroll()

	useEffect(() => {
		start()
	}, [start])

	if (phase !== 'revealed') {
		return (
			<View style={styles.rolling}>
				<Text style={styles.hint}>結果発表…！</Text>
				<DrumrollReveal phase="rolling" />
			</View>
		)
	}

	return (
		<ScrollView contentContainerStyle={styles.body}>
			<DrumrollReveal phase="revealed">
				<Text style={styles.banner}>{banner(judgement, names)}</Text>
			</DrumrollReveal>

			<View style={styles.rows}>
				{names.map((name, i) => {
					const isLoser = judgement.loserIndices.includes(i)
					const isWinner = judgement.winnerIndex === i
					const isHetare = judgement.hetareIndex === i
					return (
						<View key={i} style={[styles.row, isLoser && styles.rowLoser]}>
							<View style={[styles.colorBar, { backgroundColor: playerColor(i).value }]} />
							<Text style={styles.name} numberOfLines={1}>
								{name}
							</Text>
							<View
								style={[
									styles.chip,
									declarations[i] === 'fight' ? styles.chipFight : styles.chipFold,
								]}
							>
								<Text style={styles.chipText}>
									{declarations[i] === 'fight' ? '勝負' : '降りる'}
								</Text>
							</View>
							<Text style={styles.badges}>
								{isLoser ? '💀' : ''}
								{isWinner ? '👑' : ''}
								{isHetare ? '🐔ヘタレ賞' : ''}
							</Text>
							<Text style={styles.cardValue}>{cards[i]}</Text>
						</View>
					)
				})}
			</View>

			{judgement.hetareIndex !== null && (
				<Text style={styles.hetareNote}>
					🐔 最強カードなのに降りた {names[judgement.hetareIndex]}さんも一緒に飲もう！
				</Text>
			)}

			<GradientButton title="次のラウンド" onPress={onNextRound} />
			<Pressable accessibilityRole="button" onPress={onHome}>
				<Text style={styles.home}>終了してホームへ</Text>
			</Pressable>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	rolling: { flex: 1, justifyContent: 'center', gap: spacing.lg },
	body: { flexGrow: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.md },
	hint: { ...typography.caption, textAlign: 'center' },
	banner: { ...typography.hero, textAlign: 'center' },
	rows: { gap: spacing.sm },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		padding: spacing.sm,
	},
	rowLoser: { borderColor: colors.danger },
	colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	chip: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
	chipFight: { backgroundColor: `${OP.fight}33` },
	chipFold: { backgroundColor: `${OP.fold}33` },
	chipText: { ...typography.caption, color: colors.text },
	badges: { ...typography.caption, color: OP.hetare },
	cardValue: { ...typography.title, minWidth: 44, textAlign: 'right' },
	hetareNote: { ...typography.body, textAlign: 'center', color: OP.hetare },
	home: { ...typography.caption, textAlign: 'center', padding: spacing.sm },
})
