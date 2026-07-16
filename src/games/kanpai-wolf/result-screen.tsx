import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import type { AssignedWords } from './engine'
import type { Outcome } from './reducer'
import { KW } from './theme'

type Props = {
	outcome: Outcome
	wolfNames: string[]
	words: AssignedWords
	kanpaiCount: number
	onRetry: () => void
}

const HEADLINES: Record<Outcome, string> = {
	citizens: '😇 市民チームの勝利！',
	wolf: '🐺 ウルフの勝利！',
	'wolf-reversal': '🐺 ウルフの逆転勝利！',
}

export function ResultScreen({ outcome, wolfNames, words, kanpaiCount, onRetry }: Props) {
	return (
		<View style={styles.container}>
			<Text style={styles.headline}>{HEADLINES[outcome]}</Text>
			<View style={styles.card}>
				<Text style={styles.row}>🐺 ウルフ: {wolfNames.join('・')}</Text>
				<Text style={styles.row}>😇 市民のお題: {words.majority}</Text>
				<Text style={styles.row}>🐺 ウルフのお題: {words.wolf}</Text>
			</View>
			<Text style={styles.kanpai}>このラウンドの乾杯 🍻 × {kanpaiCount}回</Text>
			<GradientButton title="もう一回" onPress={onRetry} />
			<Pressable
				accessibilityRole="button"
				onPress={() => {
					haptics.tap()
					router.back()
				}}
				style={styles.homeButton}
			>
				<Text style={styles.homeText}>ホームへ</Text>
			</Pressable>
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
	headline: { ...typography.hero, fontSize: 32, textAlign: 'center', color: KW.wolf },
	card: {
		padding: spacing.lg,
		borderRadius: radii.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		gap: spacing.sm,
	},
	row: { ...typography.body },
	kanpai: { ...typography.caption, textAlign: 'center' },
	homeButton: {
		padding: spacing.md,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
	},
	homeText: { ...typography.body },
})
