import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { MAX_PLAYERS, MIN_PLAYERS, playersStore, usePlayers } from '@/lib/players-store'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	onClose: () => void
	minPlayers?: number
	maxPlayers?: number
}

// 参加人数と名前（任意）の設定シート。人数・名前はゲーム間で共有・永続化される
export function PlayerSetupSheet({
	visible,
	onClose,
	minPlayers = MIN_PLAYERS,
	maxPlayers = MAX_PLAYERS,
}: Props) {
	const players = usePlayers()

	const step = (delta: number) => {
		haptics.tap()
		playersStore.setCount(Math.min(maxPlayers, Math.max(minPlayers, players.count + delta)))
	}

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<View style={styles.sheet}>
					<Text style={styles.title}>参加メンバー</Text>
					<View style={styles.stepper}>
						<Pressable
							accessibilityRole="button"
							onPress={() => step(-1)}
							style={styles.stepBtn}
						>
							<Text style={styles.stepLabel}>−</Text>
						</Pressable>
						<Text style={styles.count}>{players.count}人</Text>
						<Pressable
							accessibilityRole="button"
							onPress={() => step(1)}
							style={styles.stepBtn}
						>
							<Text style={styles.stepLabel}>＋</Text>
						</Pressable>
					</View>
					<Text style={styles.hint}>
						名前は入力しなくてもOK（「1番」のように呼ばれます）
					</Text>
					<ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
						{Array.from({ length: players.count }, (_, i) => (
							<TextInput
								key={i}
								style={styles.input}
								placeholder={`${i + 1}番`}
								placeholderTextColor={colors.textMuted}
								value={players.names[i] ?? ''}
								onChangeText={(t) => playersStore.setName(i, t)}
								maxLength={10}
							/>
						))}
					</ScrollView>
					<GradientButton title="決定" onPress={onClose} />
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
	sheet: {
		backgroundColor: colors.surface,
		borderTopLeftRadius: radii.lg,
		borderTopRightRadius: radii.lg,
		padding: spacing.lg,
		gap: spacing.md,
		maxHeight: '80%',
	},
	title: { ...typography.title, textAlign: 'center' },
	stepper: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.lg,
	},
	stepBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepLabel: { ...typography.title, lineHeight: 26 },
	count: { ...typography.hero, minWidth: 96, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center' },
	list: { maxHeight: 240 },
	input: {
		...typography.body,
		backgroundColor: colors.background,
		borderRadius: radii.sm,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		marginBottom: spacing.sm,
	},
})
