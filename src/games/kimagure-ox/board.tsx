import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing } from '@/theme/tokens'
import type { Board } from './engine'
import { KOX } from './theme'

type Props = {
	board: Board
	blocked: number | null
	disabled: boolean
	onCellPress: (index: number) => void
}

export function BoardView({ board, blocked, disabled, onCellPress }: Props) {
	return (
		<View style={styles.grid}>
			{board.map((cell, i) => (
				<Pressable
					key={i}
					testID={`cell-${i}`}
					accessibilityRole="button"
					disabled={disabled || cell !== null || i === blocked}
					onPress={() => onCellPress(i)}
					style={styles.cell}
				>
					{i === blocked ? (
						<Text style={styles.blockedIcon}>🚧</Text>
					) : cell ? (
						<Text style={[styles.mark, { color: cell === 'o' ? KOX.o : KOX.x }]}>
							{cell === 'o' ? '◯' : '×'}
						</Text>
					) : null}
				</Pressable>
			))}
		</View>
	)
}

const CELL = 100

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignSelf: 'center',
		width: CELL * 3 + spacing.xs * 2,
		gap: spacing.xs,
	},
	cell: {
		width: CELL,
		height: CELL,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		backgroundColor: colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	mark: { fontSize: 56, fontWeight: '800', lineHeight: 64 },
	blockedIcon: { fontSize: 40 },
})
