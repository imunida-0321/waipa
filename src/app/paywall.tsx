import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { PurchasesPackage } from 'react-native-purchases'
import { AppBackground } from '@/components/ui/app-background'
import { GradientButton } from '@/components/ui/gradient-button'
import {
	getPremiumPackages,
	purchasePremium,
	restorePremium,
	usePremium,
	type PremiumPackages,
} from '@/lib/premium'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type Plan = 'monthly' | 'annual'

type Benefit = {
	icon: ComponentProps<typeof MaterialCommunityIcons>['name']
	title: string
}

const BENEFITS: Benefit[] = [
	{ icon: 'advertisements-off', title: '広告非表示' },
	{ icon: 'gamepad-variant', title: 'プレミアム限定ゲーム' },
	{ icon: 'package-variant', title: '限定お題パック' },
]

const FALLBACK_PRICES = {
	monthly: '¥150',
	annual: '¥1,100',
} as const

export default function PaywallScreen() {
	const premiumUnlocked = usePremium()
	const [packages, setPackages] = useState<PremiumPackages | null>(null)
	const [selectedPlan, setSelectedPlan] = useState<Plan>('annual')
	const [loading, setLoading] = useState(true)
	const [purchasing, setPurchasing] = useState(false)
	const [restoring, setRestoring] = useState(false)

	useEffect(() => {
		let active = true

		getPremiumPackages()
			.then((nextPackages) => {
				if (active) {
					setPackages(nextPackages)
				}
			})
			.finally(() => {
				if (active) {
					setLoading(false)
				}
			})

		return () => {
			active = false
		}
	}, [])

	const monthlyPackage = packages?.monthly ?? null
	const annualPackage = packages?.annual ?? null
	const selectedPackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage
	const purchaseDisabled = loading || purchasing || selectedPackage === null

	async function handlePurchase(pkg: PurchasesPackage | null) {
		if (pkg === null) {
			return
		}

		setPurchasing(true)
		const result = await purchasePremium(pkg)
		setPurchasing(false)

		if (result === 'purchased') {
			router.back()
			return
		}
		if (result === 'error') {
			Alert.alert('購入に失敗しました', '時間をおいてもう一度お試しください。')
		}
	}

	async function handleRestore() {
		setRestoring(true)
		const result = await restorePremium()
		setRestoring(false)

		if (result === 'restored') {
			Alert.alert('復元しました')
			router.back()
			return
		}
		if (result === 'none') {
			Alert.alert('復元できる購入が見つかりませんでした')
			return
		}
		Alert.alert('復元に失敗しました', '時間をおいてもう一度お試しください。')
	}

	return (
		<View style={styles.screen}>
			<AppBackground />
			<ScrollView contentContainerStyle={styles.content}>
				<Pressable
					testID="paywall-close"
					accessibilityRole="button"
					onPress={() => router.back()}
					style={styles.closeButton}
				>
					<MaterialCommunityIcons name="close" size={24} color={colors.text} />
				</Pressable>

				<View style={styles.hero}>
					<MaterialCommunityIcons
						name="crown"
						size={52}
						color={colors.premiumGold}
						testID="icon-crown"
					/>
					<Text style={styles.title}>WaiPa プレミアム</Text>
					<Text style={styles.copy}>広告なしで、もっと快適に遊べます。</Text>
				</View>

				<View style={styles.benefits}>
					{BENEFITS.map((benefit) => (
						<View key={benefit.title} style={styles.benefitRow}>
							<MaterialCommunityIcons
								name={benefit.icon}
								size={22}
								color={colors.premiumGold}
							/>
							<Text style={styles.benefitText}>{benefit.title}</Text>
						</View>
					))}
				</View>

				{premiumUnlocked ? (
					<View style={styles.activeBox}>
						<Text style={styles.activeText}>プレミアム利用中</Text>
					</View>
				) : (
					<>
						<View style={styles.plans}>
							<PlanOption
								label="月額"
								price={monthlyPackage?.product.priceString ?? FALLBACK_PRICES.monthly}
								selected={selectedPlan === 'monthly'}
								hasPackages={packages !== null}
								onPress={() => setSelectedPlan('monthly')}
							/>
							<PlanOption
								label="年額"
								price={annualPackage?.product.priceString ?? FALLBACK_PRICES.annual}
								selected={selectedPlan === 'annual'}
								hasPackages={packages !== null}
								onPress={() => setSelectedPlan('annual')}
							/>
						</View>
						<View style={styles.badge}>
							<Text style={styles.badgeText}>約39%お得</Text>
						</View>
						{packages === null && <Text style={styles.comingSoon}>近日対応予定</Text>}
						<GradientButton
							testID="paywall-purchase"
							title={purchasing ? '処理中...' : 'プレミアムを開始'}
							onPress={() => handlePurchase(selectedPackage)}
							disabled={purchaseDisabled}
						/>
					</>
				)}

				<Pressable
					testID="paywall-restore"
					accessibilityRole="button"
					onPress={handleRestore}
					disabled={restoring}
					style={styles.restoreButton}
				>
					<Text style={styles.restoreText}>購入を復元する</Text>
				</Pressable>
			</ScrollView>
		</View>
	)
}

function PlanOption({
	label,
	price,
	selected,
	hasPackages,
	onPress,
}: {
	label: string
	price: string
	selected: boolean
	hasPackages: boolean
	onPress: () => void
}) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={[styles.plan, selected && styles.selectedPlan]}
		>
			<Text style={styles.planLabel}>{hasPackages ? label : `${label} ${price}`}</Text>
			{hasPackages && <Text style={styles.planPrice}>{price}</Text>}
		</Pressable>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: {
		padding: spacing.lg,
		paddingBottom: spacing.xl,
		gap: spacing.md,
	},
	closeButton: {
		alignSelf: 'flex-end',
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	hero: {
		alignItems: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.md,
	},
	title: { ...typography.hero, textAlign: 'center' },
	copy: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
	benefits: { gap: spacing.sm },
	benefitRow: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.sm,
		padding: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	benefitText: { ...typography.body, fontWeight: '700' },
	plans: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	plan: {
		flex: 1,
		minHeight: 88,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.sm,
		padding: spacing.md,
		justifyContent: 'center',
		gap: spacing.xs,
	},
	selectedPlan: { borderColor: colors.premiumGold },
	planLabel: { ...typography.body, fontWeight: '700', textAlign: 'center' },
	planPrice: { ...typography.title, color: colors.premiumGold, textAlign: 'center' },
	badge: {
		alignSelf: 'center',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.premiumGold,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
	},
	badgeText: { ...typography.caption, color: colors.premiumGold, fontWeight: '700' },
	comingSoon: { ...typography.caption, textAlign: 'center' },
	activeBox: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.premiumGold,
		borderRadius: radii.sm,
		padding: spacing.lg,
		alignItems: 'center',
	},
	activeText: { ...typography.title, color: colors.premiumGold },
	restoreButton: { alignItems: 'center', padding: spacing.md },
	restoreText: { ...typography.body, color: colors.textMuted, fontWeight: '700' },
})
