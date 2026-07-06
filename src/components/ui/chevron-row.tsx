import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, spacing, typography } from '@/theme/tokens'

type Props = {
	icon: string
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
			<Text style={styles.icon}>{icon}</Text>
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.chevron}>›</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
	pressed: { opacity: 0.7 },
	icon: { fontSize: 20, marginRight: spacing.md },
	label: { ...typography.body, flex: 1 },
	chevron: { fontSize: 22, color: colors.textMuted },
})
