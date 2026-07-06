import { StyleSheet, Text, View } from 'react-native'
import { spacing, typography } from '@/theme/tokens'

// ゲーム本体（#9〜#16）が実装されるまでの仮画面
export function ComingSoonGame() {
	return (
		<View style={styles.center}>
			<Text style={styles.emoji}>🚧</Text>
			<Text style={typography.title}>近日実装！</Text>
			<Text style={styles.caption}>このゲームは開発中です</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
	emoji: { fontSize: 64 },
	caption: { ...typography.caption },
})
