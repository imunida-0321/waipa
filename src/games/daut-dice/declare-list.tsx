import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { DECLARATIONS, declarationLabel, validDeclarations } from './engine'
import { DD } from './theme'

type Props = {
	prev: number | null
	onDeclare: (value: number) => void
}

// 全21役を強い順に表示。直前の宣言以下は非活性（ルール違反が構造上起きない）
export function DeclareList({ prev, onDeclare }: Props) {
	const valid = new Set(validDeclarations(prev))
	return (
		<ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
			{DECLARATIONS.map((value) => {
				const enabled = valid.has(value)
				return (
					<Pressable
						key={value}
						accessibilityRole="button"
						disabled={!enabled}
						onPress={() => {
							haptics.tap()
							onDeclare(value)
						}}
						style={[styles.item, !enabled && styles.itemDisabled]}
					>
						<Text style={[styles.label, !enabled && styles.labelDisabled]}>
							{declarationLabel(value)}
						</Text>
					</Pressable>
				)
			})}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	scroll: { flex: 1 },
	list: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
		justifyContent: 'center',
		paddingBottom: spacing.lg,
	},
	item: {
		minWidth: 96,
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: DD.red,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	itemDisabled: { borderColor: colors.surfaceBorder, opacity: 0.35 },
	label: { ...typography.body, fontWeight: '700' },
	labelDisabled: { color: colors.textMuted },
})
