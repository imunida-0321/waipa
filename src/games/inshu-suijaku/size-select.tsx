import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { BOARD_CONFIG, JOKER_COUNT, type BoardSize } from './engine'
import { NS } from './theme'

const SIZES: readonly BoardSize[] = ['small', 'medium', 'large']

type Props = {
	onStart: (size: BoardSize) => void
}

// 盤面サイズ3択（ペア数・目安時間つき）＋スタート
export function SizeSelect({ onStart }: Props) {
	const [selected, setSelected] = useState<BoardSize>('small')

	return (
		<View style={styles.container}>
			<Text style={styles.heading}>盤面サイズをえらぼう</Text>
			<View style={styles.options}>
				{SIZES.map((size) => {
					const config = BOARD_CONFIG[size]
					const active = selected === size
					return (
						<Pressable
							key={size}
							accessibilityRole="button"
							accessibilityState={{ selected: active }}
							onPress={() => {
								haptics.tap()
								setSelected(size)
							}}
							style={[styles.option, active && styles.optionActive]}
						>
							<Text style={styles.optionLabel}>{config.label}</Text>
							<Text style={styles.optionMeta}>
								{config.pairs}ペア＋ジョーカー{JOKER_COUNT} ・ {config.estimate}
							</Text>
						</Pressable>
					)
				})}
			</View>
			<GradientButton title="スタート" onPress={() => onStart(selected)} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', padding: spacing.md, gap: spacing.lg },
	heading: { ...typography.title, textAlign: 'center' },
	options: { gap: spacing.sm },
	option: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		padding: spacing.md,
		gap: spacing.xs,
	},
	optionActive: { borderColor: NS.rose },
	optionLabel: { ...typography.title },
	optionMeta: { ...typography.caption },
})
