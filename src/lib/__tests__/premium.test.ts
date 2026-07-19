import { act, renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'
import Purchases, {
	PACKAGE_TYPE,
	type CustomerInfo,
	type MakePurchaseResult,
	type PurchasesOfferings,
	type PurchasesPackage,
} from 'react-native-purchases'
import { ENTITLEMENT_ID } from '@/constants/purchases'
import {
	getPremiumPackages,
	initPremium,
	isPremiumUnlocked,
	purchasePremium,
	restorePremium,
	usePremium,
} from '../premium'
import * as premiumModule from '../premium'

type PurchasesMock = typeof Purchases & {
	_emitCustomerInfo: (info: CustomerInfo) => void
	_reset: () => void
	_setCustomerInfo: (info: CustomerInfo) => void
	_setOfferings: (offerings: PurchasesOfferings) => void
	configure: jest.MockedFunction<typeof Purchases.configure>
	getCustomerInfo: jest.MockedFunction<typeof Purchases.getCustomerInfo>
	getOfferings: jest.MockedFunction<typeof Purchases.getOfferings>
	purchasePackage: jest.MockedFunction<typeof Purchases.purchasePackage>
	restorePurchases: jest.MockedFunction<typeof Purchases.restorePurchases>
}

type DevGlobal = typeof globalThis & { __DEV__?: boolean }
type PlatformOS = typeof Platform.OS
type PurchaseError = Error & { userCancelled?: boolean }
type PremiumTestExports = {
	_resetForTest?: () => void
}

const purchasesMock = Purchases as unknown as PurchasesMock
const premiumTestExports = premiumModule as unknown as PremiumTestExports
const g = globalThis as DevGlobal
const originalDev = g.__DEV__
const originalOS = Platform.OS

function setPlatformOS(os: PlatformOS) {
	Object.defineProperty(Platform, 'OS', {
		configurable: true,
		get: () => os,
	})
}

function makeCustomerInfo(active: boolean): CustomerInfo {
	const activeEntitlements = active
		? {
				[ENTITLEMENT_ID]: {
					identifier: ENTITLEMENT_ID,
					isActive: true,
				},
			}
		: {}

	return {
		entitlements: {
			active: activeEntitlements,
			all: activeEntitlements,
			verification: 'NOT_REQUESTED',
		},
		activeSubscriptions: active ? ['waipa_premium_annual'] : [],
		allPurchasedProductIdentifiers: active ? ['waipa_premium_annual'] : [],
		latestExpirationDate: null,
		firstSeen: '2026-07-19T00:00:00.000Z',
		originalAppUserId: 'test-user',
		requestDate: '2026-07-19T00:00:00.000Z',
		allExpirationDates: {},
		allPurchaseDates: {},
		originalApplicationVersion: null,
		originalPurchaseDate: null,
		managementURL: null,
		nonSubscriptionTransactions: [],
		subscriptionsByProductIdentifier: {},
	} as unknown as CustomerInfo
}

function makePackage(packageType: PurchasesPackage['packageType'], priceString: string) {
	return {
		identifier: packageType,
		packageType,
		product: {
			identifier: `waipa_premium_${String(packageType).toLowerCase()}`,
			priceString,
		},
		offeringIdentifier: 'default',
		presentedOfferingContext: {
			offeringIdentifier: 'default',
			placementIdentifier: null,
			targetingContext: null,
		},
		webCheckoutUrl: null,
	} as unknown as PurchasesPackage
}

function makeOfferings(packages: PurchasesPackage[], hasCurrent = true): PurchasesOfferings {
	const current = hasCurrent
		? {
				identifier: 'default',
				serverDescription: 'Default offering',
				metadata: {},
				availablePackages: packages,
				lifetime: null,
				annual: packages.find((pkg) => pkg.packageType === PACKAGE_TYPE.ANNUAL) ?? null,
				sixMonth: null,
				threeMonth: null,
				twoMonth: null,
				monthly: packages.find((pkg) => pkg.packageType === PACKAGE_TYPE.MONTHLY) ?? null,
				weekly: null,
				webCheckoutUrl: null,
			}
		: null

	return {
		current,
		all: current ? { default: current } : {},
	} as PurchasesOfferings
}

function makePurchaseResult(customerInfo: CustomerInfo, pkg: PurchasesPackage): MakePurchaseResult {
	return {
		productIdentifier: pkg.product.identifier,
		customerInfo,
		transaction: {
			transactionIdentifier: 'transaction-1',
			productIdentifier: pkg.product.identifier,
			purchaseDate: '2026-07-19T00:00:00.000Z',
			purchaseToken: null,
			originalJson: null,
			signature: null,
		},
	}
}

beforeEach(() => {
	purchasesMock._reset()
	premiumTestExports._resetForTest?.()
	delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
	delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID
	g.__DEV__ = true
	setPlatformOS('ios')
})

afterAll(() => {
	g.__DEV__ = originalDev
	setPlatformOS(originalOS)
})

describe('未構成時の互換挙動', () => {
	it('開発ビルド（__DEV__=true）では解放', () => {
		expect(isPremiumUnlocked()).toBe(true)
	})

	it('本番ビルド（__DEV__=false）ではロック', () => {
		g.__DEV__ = false
		expect(isPremiumUnlocked()).toBe(false)
	})

	it('API キー未設定なら configure せず、従来の未構成状態を維持する', async () => {
		await expect(initPremium()).resolves.toBeUndefined()
		expect(purchasesMock.configure).not.toHaveBeenCalled()
		expect(isPremiumUnlocked()).toBe(true)
		await expect(getPremiumPackages()).resolves.toBeNull()
		await expect(restorePremium()).resolves.toBe('error')
	})
})

describe('初期化とプレミアム状態', () => {
	it('iOS の RevenueCat API キーで configure し、初期 CustomerInfo を反映する', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		purchasesMock._setCustomerInfo(makeCustomerInfo(true))

		await initPremium()

		expect(purchasesMock.configure).toHaveBeenCalledTimes(1)
		expect(purchasesMock.configure).toHaveBeenCalledWith({ apiKey: 'ios-key' })
		expect(purchasesMock.addCustomerInfoUpdateListener).toHaveBeenCalledTimes(1)
		expect(purchasesMock.getCustomerInfo).toHaveBeenCalledTimes(1)
		expect(isPremiumUnlocked()).toBe(true)
	})

	it('Android では Android 用 API キーを選択する', async () => {
		setPlatformOS('android')
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID = 'android-key'

		await initPremium()

		expect(purchasesMock.configure).toHaveBeenCalledWith({ apiKey: 'android-key' })
	})

	it('2回呼んでも configure と listener 登録は1回だけ', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'

		await initPremium()
		await initPremium()

		expect(purchasesMock.configure).toHaveBeenCalledTimes(1)
		expect(purchasesMock.addCustomerInfoUpdateListener).toHaveBeenCalledTimes(1)
	})

	it('getCustomerInfo が失敗しても throw せず未購入扱いで継続する', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		purchasesMock.getCustomerInfo.mockRejectedValueOnce(new Error('network down'))

		await expect(initPremium()).resolves.toBeUndefined()

		expect(isPremiumUnlocked()).toBe(false)
	})

	it('CustomerInfo 更新 listener で usePremium 購読者へ即時反映する', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		purchasesMock._setCustomerInfo(makeCustomerInfo(false))
		await initPremium()
		const { result } = await renderHook(() => usePremium())

		expect(result.current).toBe(false)

		await act(async () => {
			purchasesMock._emitCustomerInfo(makeCustomerInfo(true))
		})

		expect(result.current).toBe(true)
		expect(isPremiumUnlocked()).toBe(true)
	})
})

describe('商品取得', () => {
	it('current offering の packageType から月額と年額を振り分ける', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		const monthly = makePackage(PACKAGE_TYPE.MONTHLY, '¥150')
		const annual = makePackage(PACKAGE_TYPE.ANNUAL, '¥1,100')
		purchasesMock._setOfferings(makeOfferings([monthly, annual]))
		await initPremium()

		await expect(getPremiumPackages()).resolves.toEqual({ monthly, annual })
	})

	it('取得失敗または current offering なしなら null を返す', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		await initPremium()

		purchasesMock.getOfferings.mockRejectedValueOnce(new Error('offerings failed'))
		await expect(getPremiumPackages()).resolves.toBeNull()

		purchasesMock._setOfferings(makeOfferings([], false))
		await expect(getPremiumPackages()).resolves.toBeNull()
	})
})

describe('購入と復元', () => {
	it('購入成功時は CustomerInfo を反映して purchased を返す', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		await initPremium()
		const pkg = makePackage(PACKAGE_TYPE.ANNUAL, '¥1,100')
		purchasesMock.purchasePackage.mockResolvedValueOnce(
			makePurchaseResult(makeCustomerInfo(true), pkg),
		)

		await expect(purchasePremium(pkg)).resolves.toBe('purchased')

		expect(purchasesMock.purchasePackage).toHaveBeenCalledWith(pkg)
		expect(isPremiumUnlocked()).toBe(true)
	})

	it('ユーザーキャンセルは cancelled、それ以外の失敗は error を返す', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		await initPremium()
		const pkg = makePackage(PACKAGE_TYPE.MONTHLY, '¥150')
		const cancelled = Object.assign(new Error('cancelled'), { userCancelled: true })

		purchasesMock.purchasePackage.mockRejectedValueOnce(cancelled as PurchaseError)
		await expect(purchasePremium(pkg)).resolves.toBe('cancelled')

		purchasesMock.purchasePackage.mockRejectedValueOnce(new Error('purchase failed'))
		await expect(purchasePremium(pkg)).resolves.toBe('error')
	})

	it('復元は CustomerInfo に応じて restored / none / error を返す', async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
		await initPremium()

		purchasesMock.restorePurchases.mockResolvedValueOnce(makeCustomerInfo(true))
		await expect(restorePremium()).resolves.toBe('restored')
		expect(isPremiumUnlocked()).toBe(true)

		purchasesMock.restorePurchases.mockResolvedValueOnce(makeCustomerInfo(false))
		await expect(restorePremium()).resolves.toBe('none')
		expect(isPremiumUnlocked()).toBe(false)

		purchasesMock.restorePurchases.mockRejectedValueOnce(new Error('restore failed'))
		await expect(restorePremium()).resolves.toBe('error')
	})
})
