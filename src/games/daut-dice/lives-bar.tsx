import { StyleSheet, Text, View } from 'react-native'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { DD } from './theme'

type Props = {
	names: string[]
	lives: number[]
	turnIndex: number
}

// 全員のライフを常時表示する帯。手番の人をプレイヤーカラーでハイライト
export function LivesBar({ names, lives, turnIndex }: Props) {
	return (
		<View style={styles.bar}>
			{names.map((name, i) => {
				// Reanimated の Babel プラグインは style prop 内の `.value` アクセスを
				// SharedValue の誤用とみなし console.warn を注入するため、事前に変数へ退避する
				const dotColor = playerColor(i).value
				return (
					<View
						key={`${i}-${name}`}
						style={[styles.chip, i === turnIndex && { borderColor: dotColor }]}
					>
						<View style={[styles.dot, { backgroundColor: dotColor }]} />
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
	)
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
		justifyContent: 'center',
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.pill,
		paddingVertical: 4,
		paddingHorizontal: spacing.sm,
	},
	dot: { width: 8, height: 8, borderRadius: 4 },
	name: { ...typography.caption, color: colors.text, maxWidth: 72 },
	hearts: { fontSize: 12, color: DD.heart },
})
