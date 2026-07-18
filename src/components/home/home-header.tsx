import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PillButton } from '@/components/ui/pill-button'
import { haptics } from '@/lib/haptics'
import { colors, spacing, typography } from '@/theme/tokens'

// ホームのヘッダー。プレミアム導線・メニューはどちらも設定画面へ（ペイウォールは #7 で差し替え）
export function HomeHeader() {
	return (
		<View style={styles.row}>
			<Text style={styles.logo}>WaiPa</Text>
			<View style={styles.right}>
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
					onPress={() => router.push('/settings')}
				/>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="メニュー"
					onPress={() => {
						haptics.tap()
						router.push('/settings')
					}}
					style={styles.menuBtn}
				>
					<Text style={styles.menuIcon}>≡</Text>
				</Pressable>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: spacing.sm,
	},
	logo: { ...typography.title, fontSize: 26, fontWeight: '800' },
	right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
	menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	menuIcon: { fontSize: 26, color: colors.text },
})
