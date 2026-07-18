import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { getActiveSet, useCustomPunishments } from '@/lib/custom-punishments-store'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { CustomPunishmentsSheet } from './custom-punishments-sheet'
import { BOARD_CONFIG, JOKER_COUNT, type BoardSize } from './engine'
import { NS } from './theme'

const SIZES: readonly BoardSize[] = ['small', 'medium', 'large']

type Props = {
	onStart: (size: BoardSize) => void
}

// 盤面サイズ3択（ペア数・目安時間つき）＋スタート
export function SizeSelect({ onStart }: Props) {
	const [selected, setSelected] = useState<BoardSize>('small')
	const [customVisible, setCustomVisible] = useState(false)
	const custom = useCustomPunishments()
	const activeSet = getActiveSet(custom)
	const activeCount = activeSet.items.length
	const customStatus = custom.enabled ? `${activeCount}件 有効` : 'オフ'

	return (
		<View style={styles.container}>
			<Text style={styles.heading}>盤面サイズをえらぼう</Text>
			<Pressable
				accessibilityRole="button"
				onPress={() => {
					haptics.tap()
					setCustomVisible(true)
				}}
				style={styles.customRow}
			>
				<View style={styles.crownBadge}>
					<MaterialCommunityIcons
						name="crown"
						testID="icon-crown"
						size={18}
						color={colors.premiumGold}
					/>
				</View>
				<View style={styles.customBody}>
					<Text style={styles.customTitle}>カスタムお題</Text>
					<Text style={styles.customMeta}>自分たちの罰ゲームを追加</Text>
				</View>
				<Text style={styles.customStatus}>{customStatus}</Text>
			</Pressable>
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
			<CustomPunishmentsSheet
				visible={customVisible}
				onClose={() => setCustomVisible(false)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', padding: spacing.md, gap: spacing.lg },
	heading: { ...typography.title, textAlign: 'center' },
	customRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.premiumGold,
		borderRadius: radii.md,
		padding: spacing.md,
		gap: spacing.md,
	},
	crownBadge: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: colors.premiumGold,
		alignItems: 'center',
		justifyContent: 'center',
	},
	customBody: { flex: 1, gap: spacing.xs },
	customTitle: { ...typography.body, fontWeight: '700' },
	customMeta: { ...typography.caption },
	customStatus: { ...typography.caption, color: colors.premiumGold, fontWeight: '700' },
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
