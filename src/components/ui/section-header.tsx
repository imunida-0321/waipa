import { StyleSheet, Text } from 'react-native'
import { spacing, typography } from '@/theme/tokens'

// 「ゲーム一覧」「設定」等のセクション見出し
export function SectionHeader({ title }: { title: string }) {
	return <Text style={styles.title}>{title}</Text>
}

const styles = StyleSheet.create({
	title: { ...typography.title, marginVertical: spacing.md },
})
