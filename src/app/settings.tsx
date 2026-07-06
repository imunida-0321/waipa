import { ScrollView, StyleSheet, Text } from 'react-native'
import { Card } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/section-header'
import { SettingToggleRow } from '@/components/ui/setting-toggle-row'
import { settingsStore, useSettings } from '@/lib/settings-store'
import { colors, spacing, typography } from '@/theme/tokens'

// 設定画面の骨組み。プレミアム誘導カード・購入復元等の完全版は #5 で実装
export default function SettingsScreen() {
	const settings = useSettings()

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<SectionHeader title="設定" />
			<Card>
				<SettingToggleRow
					icon="🔊"
					label="効果音"
					value={settings.soundEnabled}
					onValueChange={(v) => settingsStore.setSoundEnabled(v)}
				/>
				<SettingToggleRow
					icon="📳"
					label="バイブレーション"
					value={settings.hapticsEnabled}
					onValueChange={(v) => settingsStore.setHapticsEnabled(v)}
				/>
			</Card>
			<Text style={styles.note}>プレミアム・言語設定などは準備中です</Text>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { padding: spacing.md, paddingBottom: spacing.xl },
	note: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg },
})
