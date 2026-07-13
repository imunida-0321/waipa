import { StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { decideLosers, type PlayerResult, type State } from './engine'
import { BS } from './theme'

type Props = {
	state: State
	names: string[]
	onRetry: () => void
	onHome: () => void
}

// リザルト: スコア降順ランキング＋地雷位置の答え合わせ＋敗者発表
export function RoundResult({ state, names, onRetry, onHome }: Props) {
	const results = state.results as PlayerResult[] // result フェーズでは全員分確定済み
	const losers = decideLosers(results)
	const ranking = results.map((r, i) => ({ ...r, index: i })).sort((a, b) => b.score - a.score)

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{losers.map((i) => names[i]).join('・')}さんの負け！</Text>
			<View style={styles.list}>
				{ranking.map((r) => {
					// playerColor(...).value は shared value ではない通常のプロパティだが、
					// JSX の style 属性内で `.value` に直接アクセスすると reanimated/worklets の
					// babel プラグインが「inline style での shared value 直接参照」と誤検知し、
					// console.warn を挿入してしまう。style 属性の外で変数に受けて回避する
					const barColor = playerColor(r.index).value
					return (
						<View
							key={r.index}
							style={[styles.row, losers.includes(r.index) && styles.loserRow]}
						>
							<View style={[styles.bar, { backgroundColor: barColor }]} />
							<Text style={styles.name}>{names[r.index]}</Text>
							<Text style={styles.mine}>地雷: {state.mines[r.index]}</Text>
							<Text style={[styles.score, r.exploded && styles.explodedScore]}>
								{r.exploded ? '💥' : ''}
								{r.score}
							</Text>
						</View>
					)
				})}
			</View>
			<GradientButton title="もう一回" onPress={onRetry} />
			<SecondaryButton title="ホームへ" onPress={onHome} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: { gap: spacing.md },
	title: { ...typography.title, textAlign: 'center' },
	list: { gap: spacing.xs },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	loserRow: { borderColor: BS.red },
	bar: { width: 4, height: 24, borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	mine: { ...typography.caption },
	score: { ...typography.title, minWidth: 64, textAlign: 'right' },
	explodedScore: { color: BS.red },
})
