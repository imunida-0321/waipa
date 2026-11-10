import { act, render } from '@testing-library/react-native'
import Purchases, { type CustomerInfo } from 'react-native-purchases'
import { HomeBannerAd } from '@/components/home/home-banner-ad'
import { ENTITLEMENT_ID } from '@/constants/purchases'
import { initAds, _resetForTest as resetAds } from '@/lib/ads'
import { initPremium, _resetForTest as resetPremium } from '@/lib/premium'

// ads.ts と premium.ts は実物を使い、ネイティブ SDK だけをルート __mocks__ の手動モックに差し替える。
// バナーの表示条件は「広告の初期化」と「購読状態」の組み合わせで決まるため、両方を通して検証する（#158）
jest.mock('react-native-google-mobile-ads')
jest.mock('expo-tracking-transparency')
jest.mock('react-native-purchases')
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

type PurchasesMock = typeof Purchases & {
	_emitCustomerInfo: (info: CustomerInfo) => void
	_reset: () => void
	_setCustomerInfo: (info: CustomerInfo) => void
}
type DevGlobal = typeof globalThis & { __DEV__?: boolean }

const purchasesMock = Purchases as unknown as PurchasesMock
const g = globalThis as DevGlobal
const originalDev = g.__DEV__

function customerInfo(active: boolean): CustomerInfo {
	return {
		entitlements: {
			active: active
				? { [ENTITLEMENT_ID]: { identifier: ENTITLEMENT_ID, isActive: true } }
				: {},
		},
	} as unknown as CustomerInfo
}

// _layout.tsx と同じ順（購読状態の確定 → 広告の初期化）で起動処理を進める
async function startUp() {
	await act(async () => {
		await initPremium()
		await initAds()
	})
}

beforeEach(() => {
	jest.clearAllMocks()
	purchasesMock._reset()
	resetAds()
	resetPremium()
	// RevenueCat を結線した本番ビルドを想定する
	g.__DEV__ = false
	process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key'
})

afterAll(() => {
	g.__DEV__ = originalDev
	delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
})

describe('HomeBannerAd', () => {
	it('広告の初期化が済むまではバナーを描画しない', async () => {
		const { queryByTestId } = await render(<HomeBannerAd />)

		expect(queryByTestId('home-banner-ad')).toBeNull()
	})

	it('非プレミアムなら、広告の初期化後にバナー枠を表示する', async () => {
		const { queryByTestId } = await render(<HomeBannerAd />)

		await startUp()

		expect(queryByTestId('home-banner-ad')).not.toBeNull()
	})

	it('プレミアム（購読者）なら、起動処理が終わってもバナーを描画しない', async () => {
		purchasesMock._setCustomerInfo(customerInfo(true))
		const { queryByTestId } = await render(<HomeBannerAd />)

		await startUp()

		expect(queryByTestId('home-banner-ad')).toBeNull()
	})

	it('表示中にプレミアムになったら、バナーを消す', async () => {
		const { queryByTestId } = await render(<HomeBannerAd />)
		await startUp()
		expect(queryByTestId('home-banner-ad')).not.toBeNull()

		await act(async () => {
			purchasesMock._emitCustomerInfo(customerInfo(true))
		})

		expect(queryByTestId('home-banner-ad')).toBeNull()
	})
})
