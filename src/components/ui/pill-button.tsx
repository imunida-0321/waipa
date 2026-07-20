import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { radii, spacing, typography } from '@/theme/tokens'
import { GlassSurface } from './glass-surface'

type Props = {
	title: string
	icon?: ReactNode
	onPress: () => void
}

// ヘッダーの「プレミアム」（王冠アイコン付き）等、ガラス面ピル型の小ボタン
export function PillButton({ title, icon, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => pressed && styles.pressed}
		>
			<GlassSurface style={styles.pill}>
				{icon}
				<Text style={styles.title}>{title}</Text>
			</GlassSurface>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	pill: {
		borderRadius: radii.pill,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	pressed: { opacity: 0.7 },
	title: { ...typography.body, fontSize: 14, fontWeight: '600' },
})
