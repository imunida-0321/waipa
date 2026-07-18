import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	title: string
	icon?: ReactNode
	onPress: () => void
}

// ヘッダーの「プレミアム」（王冠アイコン付き）等、枠線ピル型の小ボタン
export function PillButton({ title, icon, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
		>
			{icon}
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
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	pressed: { opacity: 0.7 },
	title: { ...typography.body, fontSize: 14, fontWeight: '600' },
})
