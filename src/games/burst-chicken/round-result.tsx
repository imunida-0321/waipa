import { StyleSheet, Text, View } from 'react-native'
import { GlassSurface } from '@/components/ui/glass-surface'
import { GradientButton } from '@/components/ui/gradient-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import type { State } from './engine'
import { BC } from './theme'

type Props = {
	state: State
	names: string[]
	onRetry: () => void
	onHome: () => void
}

// ラウンド終了のリザルト（バースト・精算 共通）: L の答え合わせ＋貢献ランキング＋敗者＋もう一回/ホームへ
export function RoundResult({ state, names, onRetry, onHome }: Props) {
	const loserNames = state.losers.map((i) => `${names[i]}さん`).join('、')
	// 貢献の少ない順（危険を取らなかった順）に並べる
	const ranking = state.contributions
		.map((points, index) => ({ points, index }))
		.sort((a, b) => a.points - b.points)

	return (
		<View style={styles.container}>
			<Text style={styles.loser}>
				{state.phase === 'exploded' ? '💥 ' : ''}
				{loserNames}の負け！
			</Text>
			<Text style={styles.limitReveal}>上限は {state.limit} だった！</Text>

			<GlassSurface style={styles.rankingCard}>
				{ranking.map(({ points, index }) => {
					const color = playerColor(index).value
					return (
						<View key={index} style={styles.rankingRow}>
							<View style={[styles.colorBar, { backgroundColor: color }]} />
							<Text
								style={[
									styles.rankingName,
									state.losers.includes(index) && styles.rankingLoser,
								]}
								numberOfLines={1}
							>
								{names[index]}
							</Text>
							<Text style={styles.rankingPoints}>{points}pt</Text>
						</View>
					)
				})}
			</GlassSurface>

			<GradientButton title="もう一回" onPress={onRetry} />
			<Text style={styles.homeLink} onPress={onHome}>
				ホームへ
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { gap: spacing.md, alignItems: 'stretch' },
	loser: { ...typography.title, textAlign: 'center', color: BC.red },
	limitReveal: { ...typography.body, textAlign: 'center', color: colors.textMuted },
	rankingCard: {
		borderRadius: radii.lg,
		padding: spacing.md,
		gap: spacing.sm,
	},
	rankingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
	colorBar: { width: 4, height: 20, borderRadius: 2 },
	rankingName: { ...typography.body, color: colors.text, flex: 1 },
	rankingLoser: { color: BC.red, fontWeight: '800' },
	rankingPoints: { ...typography.body, color: colors.textMuted },
	homeLink: {
		...typography.body,
		color: colors.textMuted,
		textAlign: 'center',
		padding: spacing.sm,
	},
})
