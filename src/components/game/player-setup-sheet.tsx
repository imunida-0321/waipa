import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { haptics } from '@/lib/haptics'
import {
	allNamesFilled,
	MAX_PLAYERS,
	MIN_PLAYERS,
	playersStore,
	usePlayers,
} from '@/lib/players-store'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	onProceed: () => void
	minPlayers?: number
	maxPlayers?: number
}

// ゲーム開始前の必須ゲート。参考UI準拠: プレイヤーカラー付きカード / ⊕追加 / 履歴 / 白い「つぎへ」
export function PlayerSetupSheet({
	onProceed,
	minPlayers = MIN_PLAYERS,
	maxPlayers = MAX_PLAYERS,
}: Props) {
	const insets = useSafeAreaInsets()
	const players = usePlayers()
	const [showError, setShowError] = useState(false)

	// ゲーム側の minPlayers/maxPlayers は players-store のグローバル人数より厳しい場合がある
	// （例: 直前に2人用ゲームで人数を絞った後、最小3人のゲームに遷移する等）。
	// マウント時に範囲外ならクランプし、投票などが人数不足で成立しない状態を防ぐ
	useEffect(() => {
		if (players.count < minPlayers) {
			playersStore.setCount(minPlayers)
		} else if (players.count > maxPlayers) {
			playersStore.setCount(maxPlayers)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const proceed = async () => {
		haptics.tap()
		if (!allNamesFilled(players)) {
			setShowError(true)
			return
		}
		setShowError(false)
		await playersStore.saveToHistory()
		onProceed()
	}

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="閉じる"
					onPress={() => {
						haptics.tap()
						router.back()
					}}
					style={styles.headerBtn}
				>
					<Text style={styles.headerIcon}>×</Text>
				</Pressable>
				<Text style={styles.headerTitle}>参加メンバー</Text>
				<View style={styles.headerBtn} />
			</View>

			{showError && (
				<View style={styles.banner}>
					<Text style={styles.bannerText}>名前が入力されていないものがあります</Text>
				</View>
			)}

			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				{Array.from({ length: players.count }, (_, i) => {
					const color = playerColor(i)
					const empty = !players.names[i]?.trim()
					return (
						<View
							key={`${i}-${players.count}`}
							style={[styles.card, showError && empty && styles.cardError]}
						>
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
									{set.map((n, j) => (n.trim() ? n : `${j + 1}番`)).join('、')}
								</Text>
							</Pressable>
						))
					)}
				</View>
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
				<Pressable accessibilityRole="button" onPress={proceed} style={styles.nextBtn}>
					<Text style={styles.nextLabel}>つぎへ</Text>
				</Pressable>
			</View>
		</View>
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
	banner: {
		marginHorizontal: spacing.md,
		marginBottom: spacing.sm,
		backgroundColor: colors.danger,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	bannerText: { ...typography.body, fontWeight: '700', textAlign: 'center' },
	content: { padding: spacing.md, gap: spacing.md },
	card: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		overflow: 'hidden',
	},
	cardError: { borderColor: colors.danger },
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
	footer: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
	nextBtn: {
		backgroundColor: colors.text,
		borderRadius: radii.md,
		paddingVertical: spacing.md,
		alignItems: 'center',
	},
	nextLabel: { fontSize: 18, fontWeight: '800', color: colors.background },
})
