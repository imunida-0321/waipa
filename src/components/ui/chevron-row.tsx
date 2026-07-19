import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, spacing, typography } from '@/theme/tokens'

type Props = {
	icon: ComponentProps<typeof MaterialCommunityIcons>['name']
	label: string
	onPress: () => void
}

// 設定画面の「購入を復元する」「レビューを書く」等の遷移行
export function ChevronRow({ icon, label, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.row, pressed && styles.pressed]}
		>
			<MaterialCommunityIcons name={icon} size={20} color={colors.text} style={styles.icon} />
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.chevron}>›</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
	pressed: { opacity: 0.7 },
	icon: { marginRight: spacing.md },
	label: { ...typography.body, flex: 1 },
	chevron: { fontSize: 22, color: colors.textMuted },
})
