import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/theme/tokens'

type Props = {
	icon: ComponentProps<typeof MaterialCommunityIcons>['name']
	label: string
	value: string
}

// 設定画面の「言語：日本語」のような値表示のみの行（MVPでは選択操作なし）
export function SettingValueRow({ icon, label, value }: Props) {
	return (
		<View style={styles.row}>
			<MaterialCommunityIcons name={icon} size={20} color={colors.text} style={styles.icon} />
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.value}>{value}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
	icon: { marginRight: spacing.md },
	label: { ...typography.body, flex: 1 },
	value: { ...typography.body, color: colors.textMuted },
})
