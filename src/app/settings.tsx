import { router } from 'expo-router'
import { Alert, ScrollView, StyleSheet } from 'react-native'
import { PremiumUpsellCard } from '@/components/settings/premium-upsell-card'
import { Card } from '@/components/ui/card'
import { ChevronRow } from '@/components/ui/chevron-row'
import { SectionHeader } from '@/components/ui/section-header'
import { SettingToggleRow } from '@/components/ui/setting-toggle-row'
import { SettingValueRow } from '@/components/ui/setting-value-row'
import { restorePremium } from '@/lib/premium'
import { settingsStore, useSettings } from '@/lib/settings-store'
import { contactSupport, writeReview } from '@/lib/support'
import { colors, spacing } from '@/theme/tokens'

function showPaywall() {
	router.push('/paywall')
}

async function handleRestorePremium() {
	const result = await restorePremium()
	if (result === 'restored') {
		Alert.alert('復元しました')
		return
	}
	if (result === 'none') {
		Alert.alert('復元できる購入が見つかりませんでした')
		return
	}
	Alert.alert('復元に失敗しました', '時間をおいてもう一度お試しください。')
}

export default function SettingsScreen() {
	const settings = useSettings()

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<PremiumUpsellCard onUpgradePress={showPaywall} />
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
				<ChevronRow icon="🛒" label="購入を復元する" onPress={handleRestorePremium} />
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
