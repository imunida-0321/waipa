import { StyleSheet, Text, View } from 'react-native'
import { ResultOverlay } from '@/components/game/result-overlay'
import { GlassSurface } from '@/components/ui/glass-surface'
import { playerColor } from '@/theme/player-colors'
import { radii, spacing, typography } from '@/theme/tokens'
import { RP } from './theme'

type Props = {
	names: string[]
	scores: number[]
	punishCounts: number[]
	loserIndex: number | null
	onRetry: () => void
	onHome: () => void
}

// スコア降順・同数同順位（1位, 1位, 3位 方式）
export function rankOf(scores: number[]): number[] {
	return scores.map((s) => scores.filter((o) => o > s).length + 1)
}

export function ResultScreen({ names, scores, punishCounts, loserIndex, onRetry, onHome }: Props) {
	const ranks = rankOf(scores)
	const order = names.map((_, i) => i).sort((a, b) => ranks[a] - ranks[b] || a - b)

	return (
		<ResultOverlay visible onRetry={onRetry} onHome={onHome}>
			<View style={styles.container}>
				{loserIndex !== null && (
					<Text style={styles.loser}>{names[loserIndex]}さん、ジョーカーで即負け！</Text>
				)}
				<Text style={styles.heading}>獲得ペア数ランキング</Text>
				{order.map((i) => {
					const rowColor = playerColor(i).value
					return (
						<GlassSurface key={i} style={styles.row}>
							<Text style={styles.rank}>{ranks[i]}位</Text>
							<View style={[styles.colorBar, { backgroundColor: rowColor }]} />
							<Text style={styles.name} numberOfLines={1}>
								{names[i]}
							</Text>
							<Text style={styles.score}>{scores[i]}ペア</Text>
							<Text style={styles.punish}>罰 {punishCounts[i]}回</Text>
						</GlassSurface>
					)
				})}
			</View>
		</ResultOverlay>
	)
}

const styles = StyleSheet.create({
	container: { gap: spacing.sm },
	loser: { ...typography.title, color: RP.joker, textAlign: 'center', marginBottom: spacing.md },
	heading: { ...typography.caption, textAlign: 'center', marginBottom: spacing.xs },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	rank: { ...typography.body, fontWeight: '800', width: 40 },
	colorBar: { width: 4, height: 24, borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	score: { ...typography.body, fontWeight: '700', color: RP.green },
	punish: { ...typography.caption },
})
