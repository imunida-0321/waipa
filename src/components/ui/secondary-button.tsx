import { Pressable, StyleSheet, Text } from 'react-native'
import { haptics } from '@/lib/haptics'
import { radii, spacing, typography } from '@/theme/tokens'
import { GlassSurface } from './glass-surface'

type Props = {
	title: string
	onPress: () => void
}

// GradientButton と同ジオメトリ（余白・角丸・中央寄せ・太字）のガラス面ボタン。
// 「もう一回（Gradient）＋ホームへ（Secondary）」のようなペアで使い、色以外を揃える
export function SecondaryButton({ title, onPress }: Props) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => pressed && styles.pressed}
		>
			<GlassSurface style={styles.button}>
				<Text style={styles.title}>{title}</Text>
			</GlassSurface>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
		borderRadius: radii.md,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.md,
		alignItems: 'center',
	},
	pressed: { opacity: 0.7 },
	title: { ...typography.body, fontWeight: '700' },
})
