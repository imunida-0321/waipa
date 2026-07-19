import { useSyncExternalStore } from 'react'
import { Platform } from 'react-native'
import Purchases, {
	PACKAGE_TYPE,
	type CustomerInfo,
	type PurchasesPackage,
} from 'react-native-purchases'
import { ENTITLEMENT_ID } from '@/constants/purchases'

export type PremiumPackages = {
	monthly: PurchasesPackage | null
	annual: PurchasesPackage | null
}

export type PurchasePremiumResult = 'purchased' | 'cancelled' | 'error'
export type RestorePremiumResult = 'restored' | 'none' | 'error'

let configured = false
let unlocked = false
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

function getRevenueCatApiKey(): string | null {
	const key =
		Platform.OS === 'android'
			? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID
			: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS

	return key && key.length > 0 ? key : null
}

function hasPremiumEntitlement(customerInfo: CustomerInfo): boolean {
	return customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive === true
}

function setUnlocked(nextUnlocked: boolean) {
	if (unlocked === nextUnlocked) {
		return
	}
	unlocked = nextUnlocked
	emit()
}

function isUserCancelled(error: unknown): boolean {
	if (typeof error !== 'object' || error === null || !('userCancelled' in error)) {
		return false
	}

	return (error as { userCancelled?: unknown }).userCancelled === true
}

// RevenueCat の CustomerInfo を唯一の購読状態として保持する。
// APIキー未設定時は既存の開発ビルド解放挙動を残し、ローカル確認を妨げない
export async function initPremium(): Promise<void> {
	if (configured) {
		return
	}

	const apiKey = getRevenueCatApiKey()
	if (apiKey === null) {
		return
	}

	Purchases.configure({ apiKey })
	configured = true
	Purchases.addCustomerInfoUpdateListener((customerInfo) => {
		setUnlocked(hasPremiumEntitlement(customerInfo))
	})

	try {
		const customerInfo = await Purchases.getCustomerInfo()
		setUnlocked(hasPremiumEntitlement(customerInfo))
	} catch {
		setUnlocked(false)
	}
}

export function isPremiumUnlocked(): boolean {
	if (!configured) {
		return __DEV__
	}

	return unlocked
}

export function usePremium(): boolean {
	return useSyncExternalStore(
		(fn) => {
			listeners.add(fn)
			return () => listeners.delete(fn)
		},
		isPremiumUnlocked,
		isPremiumUnlocked,
	)
}

export async function getPremiumPackages(): Promise<PremiumPackages | null> {
	if (!configured) {
		return null
	}

	try {
		const offerings = await Purchases.getOfferings()
		if (offerings.current === null) {
			return null
		}

		return {
			monthly:
				offerings.current.availablePackages.find(
					(pkg) => pkg.packageType === PACKAGE_TYPE.MONTHLY,
				) ?? null,
			annual:
				offerings.current.availablePackages.find(
					(pkg) => pkg.packageType === PACKAGE_TYPE.ANNUAL,
				) ?? null,
		}
	} catch {
		return null
	}
}

export async function purchasePremium(pkg: PurchasesPackage): Promise<PurchasePremiumResult> {
	if (!configured) {
		return 'error'
	}

	try {
		const result = await Purchases.purchasePackage(pkg)
		const nextUnlocked = hasPremiumEntitlement(result.customerInfo)
		setUnlocked(nextUnlocked)
		return nextUnlocked ? 'purchased' : 'error'
	} catch (error) {
		return isUserCancelled(error) ? 'cancelled' : 'error'
	}
}

export async function restorePremium(): Promise<RestorePremiumResult> {
	if (!configured) {
		return 'error'
	}

	try {
		const customerInfo = await Purchases.restorePurchases()
		const nextUnlocked = hasPremiumEntitlement(customerInfo)
		setUnlocked(nextUnlocked)
		return nextUnlocked ? 'restored' : 'none'
	} catch {
		return 'error'
	}
}

export function _resetForTest() {
	configured = false
	unlocked = false
	listeners.clear()
}
