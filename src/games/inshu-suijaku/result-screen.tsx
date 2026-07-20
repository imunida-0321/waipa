import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GlassSurface } from '@/components/ui/glass-surface'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playerColor } from '@/theme/player-colors'
import { radii, spacing, typography } from '@/theme/tokens'
import { NS } from './theme'

export type RankingRow = {
	index: number
	name: string
	score: number
	rank: number
}

// スコア降順・同数同順位（1224 方式）
export function buildRanking(names: string[], scores: number[]): RankingRow[] {
	const rows = names.map((name, index) => ({ name, index, score: scores[index] ?? 0 }))
	rows.sort((a, b) => b.score - a.score)
	return rows.map((r) => ({ ...r, rank: 1 + rows.filter((o) => o.score > r.score).length }))
}

type Props = {
	names: string[]
	scores: number[]
	onRetry: () => void
	onHome: () => void
}

export function ResultScreen({ names, scores, onRetry, onHome }: Props) {
	const rows = buildRanking(names, scores)
	const rowScores = rows.map((r) => r.score)
	const minScore = Math.min(...rowScores)
	const maxScore = Math.max(...rowScores)
	const allTied = minScore === maxScore

	return (
		<View style={styles.container}>
			<Text style={styles.heading}>🏆 結果発表</Text>
			<ScrollView contentContainerStyle={styles.list}>
				{rows.map((row) => {
					const isLast = !allTied && row.score === minScore
					return (
						<GlassSurface key={row.index} style={[styles.row, isLast && styles.lastRow]}>
							<Text style={styles.rank}>{row.rank}位</Text>
							<View
								style={[
									styles.colorBar,
									{ backgroundColor: playerColor(row.index).value },
								]}
							/>
							<Text style={styles.name} numberOfLines={1}>
								{row.name}
							</Text>
							{isLast && <Text style={styles.lastBadge}>最下位</Text>}
							<Text style={styles.score}>{row.score}ペア</Text>
						</GlassSurface>
					)
				})}
			</ScrollView>
			<GradientButton title="もう一回" onPress={onRetry} />
			<Pressable
				accessibilityRole="button"
				onPress={() => {
					haptics.tap()
					onHome()
				}}
				style={styles.homeBtn}
			>
				<Text style={styles.homeText}>ホームへ</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md, gap: spacing.md },
	heading: { ...typography.title, textAlign: 'center', marginTop: spacing.md },
	list: { gap: spacing.sm },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		borderRadius: radii.md,
		padding: spacing.md,
	},
	lastRow: { borderWidth: 1, borderColor: NS.rose },
	rank: { ...typography.body, fontWeight: '800', width: 44 },
	colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	lastBadge: {
		...typography.caption,
		color: NS.rose,
		fontWeight: '800',
		borderWidth: 1,
		borderColor: NS.rose,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
	},
	score: { ...typography.body, fontWeight: '700' },
	homeBtn: { alignItems: 'center', padding: spacing.sm },
	homeText: { ...typography.caption },
})
