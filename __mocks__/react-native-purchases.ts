import type {
	CustomerInfo,
	CustomerInfoUpdateListener,
	MakePurchaseResult,
	PurchasesOfferings,
	PurchasesPackage,
} from 'react-native-purchases'

export const PACKAGE_TYPE = {
	UNKNOWN: 'UNKNOWN',
	CUSTOM: 'CUSTOM',
	LIFETIME: 'LIFETIME',
	ANNUAL: 'ANNUAL',
	SIX_MONTH: 'SIX_MONTH',
	THREE_MONTH: 'THREE_MONTH',
	TWO_MONTH: 'TWO_MONTH',
	MONTHLY: 'MONTHLY',
	WEEKLY: 'WEEKLY',
} as const

const listeners = new Set<CustomerInfoUpdateListener>()

let customerInfo: CustomerInfo = makeCustomerInfo(false)
let offerings: PurchasesOfferings = { all: {}, current: null }

export const configure = jest.fn<void, [unknown]>()
export const getCustomerInfo = jest.fn<Promise<CustomerInfo>, []>(async () => customerInfo)
export const addCustomerInfoUpdateListener = jest.fn<void, [CustomerInfoUpdateListener]>((fn) => {
	listeners.add(fn)
})
export const getOfferings = jest.fn<Promise<PurchasesOfferings>, []>(async () => offerings)
export const purchasePackage = jest.fn<Promise<MakePurchaseResult>, [PurchasesPackage]>(
	async (pkg) => ({
		productIdentifier: pkg.product.identifier,
		customerInfo,
		transaction: {
			transactionIdentifier: 'mock-transaction',
			productIdentifier: pkg.product.identifier,
			purchaseDate: '2026-07-19T00:00:00.000Z',
			purchaseToken: null,
		},
	}),
)
export const restorePurchases = jest.fn<Promise<CustomerInfo>, []>(async () => customerInfo)

export function _setCustomerInfo(info: CustomerInfo) {
	customerInfo = info
}

export function _emitCustomerInfo(info: CustomerInfo) {
	customerInfo = info
	listeners.forEach((fn) => fn(info))
}

export function _setOfferings(nextOfferings: PurchasesOfferings) {
	offerings = nextOfferings
}

export function _reset() {
	listeners.clear()
	customerInfo = makeCustomerInfo(false)
	offerings = { all: {}, current: null }
	configure.mockClear()
	getCustomerInfo.mockClear()
	addCustomerInfoUpdateListener.mockClear()
	getOfferings.mockClear()
	purchasePackage.mockClear()
	restorePurchases.mockClear()
}

function makeCustomerInfo(active: boolean): CustomerInfo {
	const activeEntitlements = active
		? {
				premium: {
					identifier: 'premium',
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
		originalAppUserId: 'mock-user',
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

const Purchases = {
	PACKAGE_TYPE,
	configure,
	getCustomerInfo,
	addCustomerInfoUpdateListener,
	getOfferings,
	purchasePackage,
	restorePurchases,
	_setCustomerInfo,
	_emitCustomerInfo,
	_setOfferings,
	_reset,
}

export default Purchases
