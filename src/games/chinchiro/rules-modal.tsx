import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { CHIN } from './theme'

type Props = {
	visible: boolean
	onClose: () => void
}

type Row = {
	strength: string
	name: string
	dice: string
	note: string
	color: string
}

// 伝統的なチンチロの役一覧（強い順）
const ROWS: Row[] = [
	{
		strength: '最強',
		name: 'ピンゾロ',
		dice: '1・1・1',
		note: '即勝ち',
		color: CHIN.handColors.pinzoro,
	},
	{
		strength: '強',
		name: 'ゾロ目',
		dice: '2・2・2 〜 6・6・6',
		note: '',
		color: CHIN.handColors.arashi,
	},
	{
		strength: '強',
		name: 'シゴロ',
		dice: '4・5・6',
		note: '即勝ち',
		color: CHIN.handColors.shigoro,
	},
	{
		strength: '通常',
		name: '通常の目',
		dice: 'ゾロ目2つ＋残り1つが役',
		note: '',
		color: CHIN.handColors.me,
	},
	{
		strength: '弱',
		name: '役無し',
		dice: '1・5・6 など役ができない出目',
		note: '即負け',
		color: CHIN.handColors.nome,
	},
	{
		strength: '弱',
		name: 'ションベン',
		dice: 'サイコロが丼からこぼれる',
		note: '即負け',
		color: CHIN.handColors.hifumi,
	},
	{
		strength: '最弱',
		name: 'ヒフミ',
		dice: '1・2・3',
		note: '即負け',
		color: CHIN.handColors.hifumi,
	},
]

// 通常の目の例
const ME_EXAMPLES = [
	'1・1・6 → 6の目',
	'2・2・5 → 5の目',
	'3・3・4 → 4の目',
	'4・4・3 → 3の目',
	'5・5・2 → 2の目',
	'6・6・1 → 1の目',
]

// 役の早見表モーダル。プレイ中いつでも開ける
export function RulesModal({ visible, onClose }: Props) {
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<View style={styles.sheet}>
					<Text style={styles.title}>チンチロの役（強い順）</Text>
					<ScrollView contentContainerStyle={styles.scroll}>
						{ROWS.map((row) => (
							<View key={row.name} style={styles.row}>
								<View style={styles.rowHead}>
									<Text style={styles.strength}>{row.strength}</Text>
									<Text style={[styles.name, { color: row.color }]}>
										{row.name}
									</Text>
									{!!row.note && <Text style={styles.note}>{row.note}</Text>}
								</View>
								<Text style={styles.dice}>{row.dice}</Text>
							</View>
						))}

						<Text style={styles.sectionTitle}>「通常の目」について</Text>
						<Text style={styles.body}>
							3つのうち2つが同じ目のとき、残った1つの数字がそのまま役になります。数字が大きいほど強い役です。
						</Text>
						<View style={styles.examples}>
							{ME_EXAMPLES.map((ex) => (
								<Text key={ex} style={styles.example}>
									{ex}
								</Text>
							))}
						</View>

						<Text style={styles.footnote}>
							※
							このアプリでは賭けはありません。役なし・ションベンは3投まで振り直しでき、3投して役がなければ「目なし」。全員の役を比べて一番弱い人が負けです（同率はサドンデス）。
						</Text>
					</ScrollView>
					<SecondaryButton title="とじる" onPress={onClose} />
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(10,8,24,0.92)',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	sheet: {
		maxHeight: '86%',
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		padding: spacing.md,
		gap: spacing.md,
	},
	title: {
		...typography.title,
		textAlign: 'center',
	},
	scroll: {
		gap: spacing.sm,
	},
	row: {
		backgroundColor: colors.background,
		borderRadius: radii.md,
		padding: spacing.sm,
		gap: 2,
	},
	rowHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	strength: {
		...typography.caption,
		width: 36,
	},
	name: {
		...typography.body,
		fontWeight: '700',
		flex: 1,
	},
	note: {
		...typography.caption,
		color: CHIN.handColors.hifumi,
	},
	dice: {
		...typography.caption,
		color: colors.text,
	},
	sectionTitle: {
		...typography.body,
		fontWeight: '700',
		marginTop: spacing.sm,
	},
	body: {
		...typography.caption,
		color: colors.text,
	},
	examples: {
		backgroundColor: colors.background,
		borderRadius: radii.md,
		padding: spacing.sm,
		gap: 2,
	},
	example: {
		...typography.caption,
		color: colors.text,
	},
	footnote: {
		...typography.caption,
		marginTop: spacing.sm,
	},
})
