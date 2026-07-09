import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { playerTotals, type DigitSlot } from './payment'
import { WWP } from './theme'

type Props = {
	slots: DigitSlot[]
	playerNames: string[]
	onRetry: () => void
	onHome: () => void
}

export function Result({ slots, playerNames, onRetry, onHome }: Props) {
	const totals = playerTotals(slots, playerNames.length)

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>Who will pay?</Text>

			<View style={styles.amountRow}>
				{slots.map((slot) => {
					const assignedColor =
						slot.playerIndex !== null ? playerColor(slot.playerIndex).value : null
					const assignedName =
						slot.playerIndex !== null ? playerNames[slot.playerIndex] : null

					return (
						<View key={slot.index} style={styles.digitColumn}>
							<Text style={styles.nameLabel}>{assignedName ?? ' '}</Text>
							<Text
								style={[
									styles.digit,
									assignedColor ? { color: assignedColor } : styles.digitPending,
								]}
							>
								{slot.char}
							</Text>
						</View>
					)
				})}
			</View>

			<View style={styles.summary}>
				{playerNames.map((name, i) => (
					<View key={i} style={styles.summaryRow}>
						<View
							style={[styles.colorDot, { backgroundColor: playerColor(i).value }]}
						/>
						<Text style={styles.summaryName}>{name}</Text>
						<Text style={styles.summaryAmount}>
							¥{totals[i].toLocaleString('ja-JP')}
						</Text>
					</View>
				))}
			</View>

			<View style={styles.actions}>
				<GradientButton title="もう一度" onPress={onRetry} />
				<View style={styles.actionGap} />
				<SecondaryButton title="ホームへ" onPress={onHome} />
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: WWP.bg,
		padding: spacing.lg,
		alignItems: 'center',
	},
	title: {
		...typography.title,
		color: colors.text,
		marginBottom: spacing.md,
	},
	amountRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: spacing.xs,
		marginBottom: spacing.lg,
	},
	digitColumn: {
		alignItems: 'center',
		minWidth: 28,
	},
	nameLabel: {
		...typography.caption,
		color: colors.textMuted,
		fontSize: 10,
		height: 14,
	},
	digit: {
		...typography.hero,
		fontSize: 40,
		color: colors.text,
	},
	digitPending: {
		color: colors.textMuted,
	},
	summary: {
		width: '100%',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.md,
		marginBottom: spacing.lg,
	},
	summaryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: spacing.xs,
	},
	colorDot: {
		width: 12,
		height: 12,
		borderRadius: radii.pill,
		marginRight: spacing.sm,
	},
	summaryName: {
		...typography.body,
		color: colors.text,
		flex: 1,
	},
	summaryAmount: {
		...typography.body,
		color: colors.text,
		fontWeight: '700',
	},
	actions: {
		width: '100%',
		marginTop: spacing.md,
	},
	actionGap: {
		height: spacing.sm,
	},
})
