import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GlassSurface } from '@/components/ui/glass-surface'
import { GradientButton } from '@/components/ui/gradient-button'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { formatDeviation, formatSeconds, rankRecords, type Ranked } from './judge'
import { FSS } from './theme'

export const REVEAL_INTERVAL_MS = 600

type Props = {
	records: number[]
	playerNames: string[]
	onRetry: () => void
	onHome: () => void
}

// 1位から順にカードをめくり、敗者（同率含む）だけドラムロールで最後に発表する
export function FiveSecResult({ records, playerNames, onRetry, onHome }: Props) {
	const ranked = rankRecords(records)
	const safeCount = ranked.filter((r) => !r.isLoser).length
	const [revealed, setRevealed] = useState(0)
	const drum = useDrumroll()
	// drum.start は useDrumroll 内で useCallback(..., [durationMs]) により
	// メモ化されており、durationMs は呼び出し側で固定値のため実質的に安定した参照。
	const { start: drumStart } = drum

	useEffect(() => {
		// setInterval を1度だけ登録し、コールバック内で直接 clearInterval → drumStart() まで
		// 完結させる。revealed の更新を見てから別の effect で drumStart を呼ぶ構成にすると、
		// テスト環境の fake timer では 1 回の advanceTimersByTime あたり 1 hop しか
		// 連鎖処理されない（次の setTimeout が登録されるのは effect の再実行後＝非同期の
		// マイクロタスクフラッシュ後になるため）ため、複数区間をまたぐ待機を検証できない。
		// タイマーコールバック内で直接次のタイマーを登録すればこの問題を回避できる。
		if (safeCount === 0) {
			drumStart()
			return
		}
		let count = 0
		const id = setInterval(() => {
			count += 1
			setRevealed(count)
			if (count >= safeCount) {
				clearInterval(id)
				drumStart()
			}
		}, REVEAL_INTERVAL_MS)
		return () => clearInterval(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [safeCount])

	const losersRevealed = drum.phase === 'revealed'

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>結果発表</Text>

			{ranked.map((entry, rankIndex) => {
				const isShown = entry.isLoser ? losersRevealed : rankIndex < revealed
				return (
					<RankCard
						key={entry.playerIndex}
						entry={entry}
						rank={rankIndex + 1}
						name={playerNames[entry.playerIndex]}
						shown={isShown}
					/>
				)
			})}

			{losersRevealed && (
				<View style={styles.actions}>
					<GradientButton title="もう一回" onPress={onRetry} />
					<View style={styles.actionGap} />
					<SecondaryButton title="ホームへ" onPress={onHome} />
				</View>
			)}
		</ScrollView>
	)
}

function RankCard({
	entry,
	rank,
	name,
	shown,
}: {
	entry: Ranked
	rank: number
	name: string
	shown: boolean
}) {
	if (!shown) {
		return (
			<GlassSurface style={styles.card}>
				<Text style={styles.hiddenMark}>？？？</Text>
			</GlassSurface>
		)
	}

	const tierColor = FSS.tierColors[entry.tier]
	const isTop = rank === 1 && !entry.isLoser
	const playerColorValue = playerColor(entry.playerIndex).value

	return (
		<GlassSurface style={[styles.card, isTop && styles.topCard, entry.isLoser && styles.loserCard]}>
			<Text style={styles.rank}>{rank}位</Text>
			<View style={[styles.colorDot, { backgroundColor: playerColorValue }]} />
			<Text style={styles.name}>{name}</Text>
			{entry.tier === 'pittari' && (
				<View style={styles.pittariBadge}>
					<Text style={styles.pittariBadgeText}>ぴったり賞</Text>
				</View>
			)}
			{entry.isLoser && <Text style={styles.loserMark}>敗者！</Text>}
			<Text style={[styles.record, { color: tierColor }]}>{formatSeconds(entry.ms)}</Text>
			<Text style={styles.deviation}>{formatDeviation(entry.ms)}</Text>
		</GlassSurface>
	)
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: FSS.bg,
		padding: spacing.lg,
		justifyContent: 'center',
	},
	title: {
		...typography.title,
		textAlign: 'center',
		marginBottom: spacing.lg,
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		marginBottom: spacing.sm,
		minHeight: 52,
	},
	topCard: {
		borderWidth: 1,
		borderColor: colors.gold,
	},
	loserCard: {
		borderWidth: 1,
		borderColor: FSS.tierColors.far,
	},
	hiddenMark: {
		...typography.body,
		color: colors.textMuted,
		letterSpacing: 4,
		textAlign: 'center',
		flex: 1,
	},
	rank: {
		...typography.caption,
		width: 32,
	},
	colorDot: {
		width: 12,
		height: 12,
		borderRadius: radii.pill,
	},
	name: {
		...typography.body,
		flex: 1,
	},
	pittariBadge: {
		backgroundColor: colors.gold,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.sm,
		paddingVertical: 2,
	},
	pittariBadgeText: {
		...typography.caption,
		color: colors.background,
		fontWeight: '700',
	},
	loserMark: {
		...typography.body,
		color: FSS.tierColors.far,
		fontWeight: '700',
	},
	record: {
		...typography.body,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	deviation: {
		...typography.caption,
		width: 48,
		textAlign: 'right',
	},
	actions: {
		marginTop: spacing.md,
	},
	actionGap: {
		height: spacing.sm,
	},
})
