import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Redirect, router } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { AppBackground } from '@/components/ui/app-background'
import { Card } from '@/components/ui/card'
import { ChevronRow } from '@/components/ui/chevron-row'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { SectionHeader } from '@/components/ui/section-header'
import { SettingToggleRow } from '@/components/ui/setting-toggle-row'
import { haptics } from '@/lib/haptics'
import { settingsStore, useSettings } from '@/lib/settings-store'
import { playSound } from '@/lib/sound'
import { useTopics } from '@/lib/topics-store'
import { colors, spacing } from '@/theme/tokens'
import { ThemedText } from '@/components/themed-text'

// デザインシステム確認用ギャラリー。本番ビルドではアクセス不可
export default function GalleryScreen() {
	const settings = useSettings()
	const topics = useTopics()

	if (!__DEV__) {
		return <Redirect href="/" />
	}

	return (
		<View style={styles.screen}>
			<AppBackground />
			<ScrollView contentContainerStyle={styles.content}>
				<SectionHeader title="ボタン" />
				<GradientButton title="アップグレード" onPress={() => playSound('tap')} />
				<View style={styles.gap} />
				<GradientButton title="無効状態" onPress={() => {}} disabled />
				<View style={styles.gap} />
				<PillButton
					title="プレミアム"
					icon={
						<MaterialCommunityIcons
							name="crown"
							testID="icon-crown"
							size={14}
							color={colors.premiumGold}
						/>
					}
					onPress={() => haptics.success()}
				/>

				<SectionHeader title="カード" />
				<Card>
					<ThemedText>サーフェス #211D3A / 枠線 #332E52 / 角丸 24</ThemedText>
				</Card>

				<SectionHeader title="設定行" />
				<Card>
					<SettingToggleRow
						icon="volume-high"
						label="効果音"
						value={settings.soundEnabled}
						onValueChange={(v) => settingsStore.setSoundEnabled(v)}
					/>
					<SettingToggleRow
						icon="vibrate"
						label="バイブレーション"
						value={settings.hapticsEnabled}
						onValueChange={(v) => settingsStore.setHapticsEnabled(v)}
					/>
					<ChevronRow icon="star" label="レビューを書く" onPress={() => haptics.heavy()} />
				</Card>

				<SectionHeader title="ゲームフレーム" />
				<Card>
					<ChevronRow
						icon="gamepad-variant"
						label="デモ: ゲーム画面を開く（Who will pay）"
						onPress={() =>
							router.push({ pathname: '/game/[id]', params: { id: 'who-will-pay' } })
						}
					/>
				</Card>

				<SectionHeader title="お題データ" />
				<Card>
					<ThemedText>
						読み込み済み: {topics.topics.length}件
						{topics.fetchedAt
							? `（${new Date(topics.fetchedAt).toLocaleTimeString()} 取得）`
							: '（キャッシュなし）'}
					</ThemedText>
				</Card>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { padding: spacing.md, paddingBottom: spacing.xl },
	gap: { height: spacing.sm },
})
