import { useState } from 'react'
import {
	Alert,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View,
} from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import {
	countByType,
	customPunishmentsStore,
	getActiveSet,
	MAX_NORMAL_ITEMS,
	MAX_SPECIAL_ITEMS,
	MAX_SETS,
	MAX_TEXT_LENGTH,
	type CustomPunishment,
	useCustomPunishments,
} from '@/lib/custom-punishments-store'
import { haptics } from '@/lib/haptics'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Props = {
	visible: boolean
	onClose: () => void
}

type PunishmentType = CustomPunishment['type']
type FormState = { mode: 'add' } | { mode: 'edit'; item: CustomPunishment }

export function CustomPunishmentsSheet({ visible, onClose }: Props) {
	const custom = useCustomPunishments()
	const activeSet = getActiveSet(custom)
	const [selectedType, setSelectedType] = useState<PunishmentType>('normal')
	const [form, setForm] = useState<FormState | null>(null)
	const [formType, setFormType] = useState<PunishmentType>('normal')
	const [text, setText] = useState('')
	const visibleItems = activeSet.items.filter((item) => item.type === selectedType)
	const normalCount = countByType(activeSet, 'normal')
	const specialCount = countByType(activeSet, 'special')
	const selectedCount = selectedType === 'normal' ? normalCount : specialCount
	const selectedMax = selectedType === 'normal' ? MAX_NORMAL_ITEMS : MAX_SPECIAL_ITEMS
	const addDisabled = selectedCount >= selectedMax
	const saveDisabled = text.trim().length === 0

	const openAddForm = () => {
		if (addDisabled) return
		haptics.tap()
		setForm({ mode: 'add' })
		setFormType(selectedType)
		setText('')
	}

	const openEditForm = (item: CustomPunishment) => {
		haptics.tap()
		setForm({ mode: 'edit', item })
		setFormType(item.type)
		setText(item.text)
	}

	const save = async () => {
		if (saveDisabled) return
		if (form?.mode === 'edit') {
			await customPunishmentsStore.updateItem(form.item.id, text)
		} else {
			await customPunishmentsStore.addItem(formType, text)
			setSelectedType(formType)
		}
		haptics.success()
		setForm(null)
		setText('')
	}

	const confirmRemoveSet = (setId: string) => {
		Alert.alert('セットを削除しますか？', 'このセットのお題も削除されます。', [
			{ text: 'キャンセル', style: 'cancel' },
			{
				text: '削除',
				style: 'destructive',
				onPress: () => customPunishmentsStore.removeSet(setId),
			},
		])
	}

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<View style={styles.screen}>
				<View style={styles.header}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="閉じる"
						onPress={() => {
							haptics.tap()
							onClose()
						}}
						style={styles.headerBtn}
					>
						<Text style={styles.headerIcon}>×</Text>
					</Pressable>
					<Text style={styles.headerTitle}>カスタムお題</Text>
					<View style={styles.headerBtn} />
				</View>

				{form ? (
					<ScrollView
						contentContainerStyle={styles.content}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.segment}>
							{(['normal', 'special'] as const).map((type) => {
								const active = formType === type
								return (
									<Pressable
										key={type}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
										onPress={() => {
											haptics.tap()
											setFormType(type)
										}}
										style={[
											styles.segmentBtn,
											active && styles.segmentBtnActive,
										]}
									>
										<Text style={styles.segmentText}>
											{type === 'normal' ? '通常罰' : '特大罰'}
										</Text>
									</Pressable>
								)
							})}
						</View>

						<View style={styles.inputBox}>
							<TextInput
								style={styles.input}
								placeholder="お題を入力..."
								placeholderTextColor={colors.textMuted}
								value={text}
								onChangeText={setText}
								maxLength={MAX_TEXT_LENGTH}
								multiline
							/>
							<Text style={styles.counter}>
								{text.length}/{MAX_TEXT_LENGTH}
							</Text>
						</View>

						<GradientButton title="保存する" onPress={save} disabled={saveDisabled} />
						<Text style={styles.note}>この端末にのみ保存されます</Text>
					</ScrollView>
				) : (
					<ScrollView contentContainerStyle={styles.content}>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.setRow}
						>
							{custom.sets.map((set) => {
								const active = set.id === custom.activeSetId
								return (
									<Pressable
										key={set.id}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
										onPress={() => {
											haptics.tap()
											customPunishmentsStore.selectSet(set.id)
										}}
										onLongPress={() => confirmRemoveSet(set.id)}
										style={[styles.setChip, active && styles.setChipActive]}
									>
										<Text style={styles.setChipText}>{set.name}</Text>
									</Pressable>
								)
							})}
							<Pressable
								accessibilityRole="button"
								onPress={() => {
									haptics.tap()
									customPunishmentsStore.addSet('')
								}}
								style={[
									styles.setChip,
									custom.sets.length >= MAX_SETS && styles.disabledChip,
								]}
								disabled={custom.sets.length >= MAX_SETS}
							>
								<Text style={styles.setChipText}>＋セット</Text>
							</Pressable>
						</ScrollView>

						<View style={styles.toggleRow}>
							<View>
								<Text style={styles.toggleTitle}>デッキに混ぜる</Text>
								<Text style={styles.note}>この端末にのみ保存されます</Text>
							</View>
							<Switch
								accessibilityRole="switch"
								value={custom.enabled}
								onValueChange={(value) => customPunishmentsStore.setEnabled(value)}
								trackColor={{
									false: colors.surfaceBorder,
									true: colors.accentTo,
								}}
								thumbColor={colors.text}
							/>
						</View>

						<Text style={styles.tips}>
							💡
							カスタムお題は優先して盤面に入り、そのぶんプリセットのお題と入れ替わります。盤面のペア数より多く登録すると、毎回その中からランダムに選ばれます。
						</Text>

						<View style={styles.tabs}>
							<TabButton
								active={selectedType === 'normal'}
								label={`通常罰 ${normalCount}/${MAX_NORMAL_ITEMS}`}
								onPress={() => setSelectedType('normal')}
							/>
							<TabButton
								active={selectedType === 'special'}
								label={`特大罰 ${specialCount}/${MAX_SPECIAL_ITEMS}`}
								onPress={() => setSelectedType('special')}
							/>
						</View>

						<View style={styles.list}>
							{visibleItems.map((item) => (
								<View key={item.id} style={styles.itemRow}>
									<View style={styles.itemAccent} />
									<Text style={styles.itemText}>{item.text}</Text>
									<Pressable
										accessibilityRole="button"
										onPress={() => openEditForm(item)}
										style={styles.iconBtn}
									>
										<Text style={styles.iconText}>編集</Text>
									</Pressable>
									<Pressable
										accessibilityRole="button"
										accessibilityLabel="削除"
										onPress={() => {
											haptics.tap()
											customPunishmentsStore.removeItem(item.id)
										}}
										style={styles.iconBtn}
									>
										<Text style={styles.iconText}>削除</Text>
									</Pressable>
								</View>
							))}
						</View>

						<Pressable
							accessibilityRole="button"
							accessibilityState={{ disabled: addDisabled }}
							disabled={addDisabled}
							onPress={openAddForm}
							style={[styles.addBtn, addDisabled && styles.addBtnDisabled]}
						>
							<Text style={styles.addLabel}>⊕ 追加</Text>
						</Pressable>
					</ScrollView>
				)}

				<View style={styles.footer}>
					<Pressable accessibilityRole="button" onPress={onClose} style={styles.doneBtn}>
						<Text style={styles.doneLabel}>完了</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	)
}

function TabButton({
	active,
	label,
	onPress,
}: {
	active: boolean
	label: string
	onPress: () => void
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={[styles.tab, active && styles.tabActive]}
		>
			<Text style={styles.tabText}>{label}</Text>
		</Pressable>
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
	setRow: { gap: spacing.sm, paddingRight: spacing.md },
	setChip: {
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.pill,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		backgroundColor: colors.surface,
	},
	setChipActive: { borderColor: colors.accentFrom },
	setChipText: { ...typography.body, fontWeight: '700' },
	disabledChip: { opacity: 0.5 },
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		padding: spacing.md,
		gap: spacing.md,
	},
	toggleTitle: { ...typography.body, fontWeight: '700' },
	note: { ...typography.caption },
	tips: { ...typography.caption, lineHeight: 19 },
	tabs: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		padding: spacing.xs,
		gap: spacing.xs,
	},
	tab: {
		flex: 1,
		alignItems: 'center',
		borderRadius: radii.sm,
		paddingVertical: spacing.sm,
	},
	tabActive: { backgroundColor: colors.surfaceBorder },
	tabText: { ...typography.body, fontWeight: '700' },
	list: { gap: spacing.sm },
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		overflow: 'hidden',
	},
	itemAccent: { width: 5, alignSelf: 'stretch', backgroundColor: colors.accentFrom },
	itemText: { ...typography.body, flex: 1, padding: spacing.md },
	iconBtn: { minWidth: 48, padding: spacing.sm, alignItems: 'center' },
	iconText: { ...typography.caption, fontWeight: '700', color: colors.text },
	addBtn: {
		alignSelf: 'center',
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: colors.text,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.xl,
	},
	addBtnDisabled: { opacity: 0.5 },
	addLabel: { ...typography.body, fontWeight: '700' },
	segment: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		padding: spacing.xs,
		gap: spacing.xs,
	},
	segmentBtn: {
		flex: 1,
		alignItems: 'center',
		borderRadius: radii.sm,
		paddingVertical: spacing.sm,
	},
	segmentBtnActive: { backgroundColor: colors.surfaceBorder },
	segmentText: { ...typography.body, fontWeight: '700' },
	inputBox: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.md,
		padding: spacing.md,
		gap: spacing.sm,
	},
	input: { ...typography.body, minHeight: 104, textAlignVertical: 'top' },
	counter: { ...typography.caption, textAlign: 'right' },
	footer: { padding: spacing.md, paddingTop: spacing.sm },
	doneBtn: {
		backgroundColor: colors.text,
		borderRadius: radii.md,
		paddingVertical: spacing.md,
		alignItems: 'center',
	},
	doneLabel: { fontSize: 18, fontWeight: '800', color: colors.background },
})
