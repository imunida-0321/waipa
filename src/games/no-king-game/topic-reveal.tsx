import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { NKG } from './theme'

type Props = {
	phase: 'reveal' | 'done'
	round: number
	topicText: string
	executorNumber: number
	skipsLeft: number
	onSkip: () => void
	onRevealDone: () => void
	onNextRound: () => void
}

// お題カード表示 → 運命のボタン → ドラムロール → 「◯番！」発表 → 実行 → 次ラウンド
export function TopicReveal({
	phase,
	round,
	topicText,
	executorNumber,
	skipsLeft,
	onSkip,
	onRevealDone,
	onNextRound,
}: Props) {
	const drumroll = useDrumroll()

	const startReveal = () => {
		haptics.tap()
		drumroll.start()
	}

	// ドラムロールの発表と同時に reducer 側も done へ進める
	useEffect(() => {
		if (drumroll.phase === 'revealed' && phase === 'reveal') onRevealDone()
	}, [drumroll.phase, phase, onRevealDone])

	return (
		<View style={styles.container}>
			<Text style={styles.round}>ROUND {round}</Text>

			<View style={styles.topicCard}>
				<Text style={styles.topicLabel}>お題</Text>
				<Text style={styles.topicText}>{topicText}</Text>
			</View>

			{drumroll.phase === 'idle' && (
				<>
					{skipsLeft > 0 ? (
						<PillButton
							title={`お題をスキップ（残り${skipsLeft}回）`}
							onPress={() => {
								haptics.tap()
								onSkip()
							}}
						/>
					) : (
						<Text style={styles.skipExhausted}>スキップは使い切りました</Text>
					)}
					<GradientButton title="運命のボタン" onPress={startReveal} />
				</>
			)}

			{drumroll.phase !== 'idle' && (
				<DrumrollReveal phase={drumroll.phase}>
					<Text style={styles.executor}>{executorNumber}番！</Text>
				</DrumrollReveal>
			)}

			{phase === 'done' && (
				<>
					<Text style={styles.doneText}>
						{executorNumber}番の人は名乗り出て、お題を実行！
					</Text>
					<GradientButton title="次のラウンド（番号を配り直す）" onPress={onNextRound} />
				</>
			)}
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
	topicCard: {
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.lg,
		alignItems: 'center',
		gap: spacing.sm,
	},
	topicLabel: { ...typography.caption, color: NKG.crown },
	topicText: { ...typography.title, textAlign: 'center', lineHeight: 32 },
	executor: { ...typography.hero, fontSize: 56, color: NKG.crown },
	doneText: { ...typography.body, textAlign: 'center' },
	skipExhausted: { ...typography.caption, textAlign: 'center', opacity: 0.6 },
})
