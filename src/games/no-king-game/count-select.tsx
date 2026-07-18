import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { MAX_COUNT, MIN_COUNT } from './engine'
import { PremiumPackModal } from './premium-pack-modal'

type Props = {
	count: number
	onChangeCount: (count: number) => void
	onDeal: () => void
}

// 人数選択＋限定パック導線（スタブ）
export function CountSelect({ count, onChangeCount, onDeal }: Props) {
	const [packVisible, setPackVisible] = useState(false)

	const step = (delta: number) => {
		haptics.tap()
		onChangeCount(count + delta)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.label}>あそぶ人数</Text>
			<View style={styles.stepperRow}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="人数を減らす"
					onPress={() => step(-1)}
					disabled={count <= MIN_COUNT}
					style={[styles.stepBtn, count <= MIN_COUNT && styles.stepBtnDisabled]}
				>
					<Text style={styles.stepText}>−</Text>
				</Pressable>
				<Text style={styles.count}>{count}人</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="人数を増やす"
					onPress={() => step(1)}
					disabled={count >= MAX_COUNT}
					style={[styles.stepBtn, count >= MAX_COUNT && styles.stepBtnDisabled]}
				>
					<Text style={styles.stepText}>＋</Text>
				</Pressable>
			</View>

			<Pressable
				accessibilityRole="button"
				onPress={() => {
					haptics.tap()
					setPackVisible(true)
				}}
				style={styles.packRow}
			>
				<View style={styles.packLabel}>
					<MaterialCommunityIcons
						name="lock"
						testID="icon-lock"
						size={16}
						color={colors.text}
					/>
					<Text style={styles.packText}>限定お題パック</Text>
				</View>
				<Text style={styles.packChevron}>›</Text>
			</Pressable>

			<GradientButton title="番号を配る" onPress={onDeal} />

			<PremiumPackModal visible={packVisible} onClose={() => setPackVisible(false)} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	label: { ...typography.caption, textAlign: 'center' },
	stepperRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.xl,
	},
	stepBtn: {
		width: 56,
		height: 56,
		borderRadius: radii.md,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepBtnDisabled: { opacity: 0.35 },
	stepText: { ...typography.title, fontSize: 28 },
	count: { ...typography.hero, minWidth: 96, textAlign: 'center' },
	packRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.md,
	},
	packLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
	packText: { ...typography.body },
	packChevron: { ...typography.title, color: colors.textMuted },
})
