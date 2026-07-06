import { StyleSheet, Switch, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/theme/tokens'

type Props = {
	icon: string
	label: string
	value: boolean
	onValueChange: (v: boolean) => void
}

// 設定画面の「効果音」「バイブレーション」行（参考スクショ準拠）
export function SettingToggleRow({ icon, label, value, onValueChange }: Props) {
	return (
		<View style={styles.row}>
			<Text style={styles.icon}>{icon}</Text>
			<Text style={styles.label}>{label}</Text>
			<Switch
				accessibilityRole="switch"
				value={value}
				onValueChange={onValueChange}
				trackColor={{ true: colors.success, false: colors.surfaceBorder }}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
	icon: { fontSize: 20, marginRight: spacing.md },
	label: { ...typography.body, flex: 1 },
})
