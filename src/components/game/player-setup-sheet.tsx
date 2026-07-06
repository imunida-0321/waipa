import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { haptics } from '@/lib/haptics'
import { MAX_PLAYERS, MIN_PLAYERS, playersStore, usePlayers } from '@/lib/players-store'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	onClose: () => void
	minPlayers?: number
	maxPlayers?: number
}

// 参考UI準拠: プレイヤーカラー付きカード / ⊕追加 / 履歴 / 白い「つぎへ」
export function PlayerSetupSheet({
	visible,
	onClose,
	minPlayers = MIN_PLAYERS,
	maxPlayers = MAX_PLAYERS,
}: Props) {
	const players = usePlayers()

	const finish = async () => {
		haptics.tap()
		await playersStore.saveToHistory()
		onClose()
	}

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<View style={styles.screen}>
				<View style={styles.header}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="閉じる"
						onPress={onClose}
						style={styles.headerBtn}
					>
						<Text style={styles.headerIcon}>×</Text>
					</Pressable>
					<Text style={styles.headerTitle}>参加メンバー</Text>
					<View style={styles.headerBtn} />
				</View>

				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					{Array.from({ length: players.count }, (_, i) => {
						const color = playerColor(i)
						return (
							<View key={`${i}-${players.count}`} style={styles.card}>
								<View style={[styles.colorBar, { backgroundColor: color.value }]} />
								<View style={styles.cardBody}>
									<Text style={[styles.colorLabel, { color: color.value }]}>
										プレイヤーカラー：{color.name}
									</Text>
									<TextInput
										style={styles.input}
										placeholder="プレイヤー名を入力..."
										placeholderTextColor={colors.textMuted}
										value={players.names[i] ?? ''}
										onChangeText={(t) => playersStore.setName(i, t)}
										maxLength={10}
									/>
								</View>
								{players.count > minPlayers && (
									<Pressable
										accessibilityRole="button"
										accessibilityLabel="プレイヤーを削除"
										onPress={() => {
											haptics.tap()
											playersStore.removePlayer(i)
										}}
										style={styles.removeBtn}
									>
										<Text style={styles.removeIcon}>×</Text>
									</Pressable>
								)}
							</View>
						)
					})}

					{players.count < maxPlayers && (
						<Pressable
							accessibilityRole="button"
							onPress={() => {
								haptics.tap()
								playersStore.addPlayer()
							}}
							style={styles.addBtn}
						>
							<Text style={styles.addLabel}>⊕ 追加</Text>
						</Pressable>
					)}

					<Text style={styles.sectionTitle}>履歴</Text>
					<View style={styles.historyBox}>
						{players.history.length === 0 ? (
							<Text style={styles.historyEmpty}>履歴がまだありません。</Text>
						) : (
							players.history.map((set, i) => (
								<Pressable
									accessibilityRole="button"
									key={i}
									onPress={() => {
										haptics.tap()
										playersStore.applyHistory(i)
									}}
									style={styles.historyRow}
								>
									<Text style={styles.historyText} numberOfLines={1}>
										{set
											.map((n, j) => (n.trim() ? n : `${j + 1}番`))
											.join('、')}
									</Text>
								</Pressable>
							))
						)}
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<Pressable accessibilityRole="button" onPress={finish} style={styles.nextBtn}>
						<Text style={styles.nextLabel}>つぎへ</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 56,
		paddingHorizontal: spacing.sm,
	},
	headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	headerIcon: { fontSize: 28, color: colors.text },
	headerTitle: { ...typography.title, flex: 1, textAlign: 'center' },
	content: { padding: spacing.md, gap: spacing.md },
	card: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		overflow: 'hidden',
	},
	colorBar: { width: 5 },
	cardBody: { flex: 1, padding: spacing.md, gap: spacing.sm },
	colorLabel: { fontSize: 13, fontWeight: '700' },
	input: {
		...typography.body,
		borderBottomWidth: 1,
		borderBottomColor: colors.surfaceBorder,
		paddingVertical: spacing.xs,
	},
	removeBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
	removeIcon: { fontSize: 22, color: colors.text },
	addBtn: {
		alignSelf: 'center',
		borderWidth: 1,
		borderColor: colors.text,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.xl,
	},
	addLabel: { ...typography.body, fontWeight: '700' },
	sectionTitle: { ...typography.title, fontSize: 18, marginTop: spacing.md },
	historyBox: {
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		padding: spacing.md,
		minHeight: 96,
		justifyContent: 'center',
	},
	historyEmpty: { ...typography.body, fontWeight: '700', textAlign: 'center' },
	historyRow: { paddingVertical: spacing.sm },
	historyText: { ...typography.body },
	footer: { padding: spacing.md },
	nextBtn: {
		backgroundColor: colors.text,
		borderRadius: radii.md,
		paddingVertical: spacing.md,
		alignItems: 'center',
	},
	nextLabel: { fontSize: 18, fontWeight: '800', color: colors.background },
})
