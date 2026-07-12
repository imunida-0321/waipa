import { Alert, ScrollView, StyleSheet } from 'react-native'
import { PremiumUpsellCard } from '@/components/settings/premium-upsell-card'
import { Card } from '@/components/ui/card'
import { ChevronRow } from '@/components/ui/chevron-row'
import { SectionHeader } from '@/components/ui/section-header'
import { SettingToggleRow } from '@/components/ui/setting-toggle-row'
import { SettingValueRow } from '@/components/ui/setting-value-row'
import { settingsStore, useSettings } from '@/lib/settings-store'
import { contactSupport, writeReview } from '@/lib/support'
import { colors, spacing } from '@/theme/tokens'

// ペイウォール接続は #収益2 完了後にここを差し替える
function showPaywallComingSoon() {
	Alert.alert('準備中', 'WaiPa プレミアムは近日提供予定です。')
}

// RevenueCat (#7) 結線後に実際の購入復元へ差し替える
function showRestoreComingSoon() {
	Alert.alert('準備中', '購入の復元は課金機能の提供開始後に利用できます。')
}

export default function SettingsScreen() {
	const settings = useSettings()

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<PremiumUpsellCard onUpgradePress={showPaywallComingSoon} />
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
				<SettingValueRow icon="🌐" label="言語" value="日本語" />
			</Card>
			<SectionHeader title="その他" />
			<Card>
				<ChevronRow icon="🛒" label="購入を復元する" onPress={showRestoreComingSoon} />
				<ChevronRow icon="⭐" label="レビューを書く" onPress={() => writeReview()} />
				<ChevronRow icon="✉️" label="要望・問い合わせ" onPress={() => contactSupport()} />
			</Card>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
})
