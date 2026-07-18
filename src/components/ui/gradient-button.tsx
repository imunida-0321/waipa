import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	title: string
	onPress: () => void
	disabled?: boolean
}

// 参考スクショの「アップグレード」ボタン相当。主要アクション全般に使う
export function GradientButton({ title, onPress, disabled = false }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.pressable, (pressed || disabled) && styles.dimmed]}
		>
			<LinearGradient
				colors={[colors.accentFrom, colors.accentTo]}
				start={{ x: 0, y: 0.5 }}
				end={{ x: 1, y: 0.5 }}
				style={styles.gradient}
			>
				<Text style={styles.title}>{title}</Text>
			</LinearGradient>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	pressable: { borderRadius: radii.md, overflow: 'hidden' },
	dimmed: { opacity: 0.6 },
	// paddingHorizontal: 幅詰めで使われた場合も文字が縁に張り付かないよう確保（PillButton と同じ spacing.md）
	gradient: {
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.md,
		alignItems: 'center',
		borderRadius: radii.md,
	},
	title: { ...typography.body, fontWeight: '700' },
})
