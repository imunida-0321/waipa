import { StyleSheet, Text, View } from 'react-native'
import { ResultOverlay } from '@/components/game/result-overlay'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { DD } from './theme'

type Props = {
	names: string[]
	lives: number[]
	loserIndex: number
	onRetry: () => void
	onHome: () => void
}

export function ResultScreen({ names, lives, loserIndex, onRetry, onHome }: Props) {
	return (
		<ResultOverlay visible onRetry={onRetry} onHome={onHome}>
			<View style={styles.container}>
				<Text style={styles.loser}>💥 {names[loserIndex]}さんの負け！</Text>
				{names.map((name, i) => {
					// .value の style 直書きは worklets プラグインが warn を注入するため事前に取り出す
					const color = playerColor(i).value
					return (
						<View key={i} style={styles.row}>
							<View style={[styles.bar, { backgroundColor: color }]} />
							<Text style={styles.name} numberOfLines={1}>
								{name}
							</Text>
							<Text style={styles.hearts}>
								{lives[i] > 0 ? '♥'.repeat(lives[i]) : '💔'}
							</Text>
						</View>
					)
				})}
			</View>
		</ResultOverlay>
	)
}

const styles = StyleSheet.create({
	container: { gap: spacing.sm },
	loser: { ...typography.hero, color: DD.red, textAlign: 'center', marginBottom: spacing.md },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	bar: { width: 4, height: 24, borderRadius: 2 },
	name: { ...typography.body, flex: 1 },
	hearts: { fontSize: 14, color: '#FF6B81' },
})
