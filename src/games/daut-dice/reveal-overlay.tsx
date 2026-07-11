import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GradientButton } from '@/components/ui/gradient-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { DiceRoll3D } from './dice-roll-3d'
import { declarationLabel } from './engine'
import { DD } from './theme'

type Props = {
	declaration: number
	actual: { d1: number; d2: number; value: number }
	wasBluff: boolean
	lifeLoserName: string
	gameOver: boolean
	onDone: () => void
}

// ダウト時の出目公開。ドラムロール → 実出目3D＋判定ドン → つぎへ/結果へ
export function RevealOverlay({
	declaration,
	actual,
	wasBluff,
	lifeLoserName,
	gameOver,
	onDone,
}: Props) {
	const { phase, start } = useDrumroll()
	useEffect(() => {
		start()
	}, [start])

	return (
		<View style={styles.backdrop}>
			<Text style={styles.title}>宣言 {declarationLabel(declaration)} …ホントに？</Text>
			<DrumrollReveal phase={phase}>
				<View style={styles.revealBody}>
					<DiceRoll3D dice={[actual.d1, actual.d2]} rolling={false} rollId={1} />
					<Text style={styles.actual}>実際は {declarationLabel(actual.value)}</Text>
					<Text style={[styles.verdict, { color: wasBluff ? DD.red : DD.gold }]}>
						{wasBluff ? 'ウソだった！' : 'ホントだった！ ダウト失敗…'}
					</Text>
					<Text style={styles.penalty}>{lifeLoserName}さん ライフ-1</Text>
				</View>
			</DrumrollReveal>
			{phase === 'revealed' && (
				<GradientButton title={gameOver ? '結果へ' : 'つぎへ'} onPress={onDone} />
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10,8,24,0.96)',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	title: { ...typography.title, textAlign: 'center' },
	revealBody: { alignItems: 'center', gap: spacing.sm },
	actual: { ...typography.body, color: colors.textMuted },
	verdict: { ...typography.hero, textAlign: 'center' },
	penalty: {
		...typography.title,
		textAlign: 'center',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		overflow: 'hidden',
	},
})
