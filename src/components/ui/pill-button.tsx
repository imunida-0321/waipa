import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	title: string
	onPress: () => void
}

// ヘッダーの「👑 プレミアム」等、枠線ピル型の小ボタン
export function PillButton({ title, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
		>
			<Text style={styles.title}>{title}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	pill: {
		borderRadius: radii.pill,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		backgroundColor: colors.surface,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	pressed: { opacity: 0.7 },
	title: { ...typography.body, fontSize: 14, fontWeight: '600' },
})
