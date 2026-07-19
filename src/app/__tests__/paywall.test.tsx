import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { Alert } from 'react-native'
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases'
import PaywallScreen from '../paywall'

type PremiumPackages = {
	monthly: PurchasesPackage | null
	annual: PurchasesPackage | null
}

let mockPremiumUnlocked = false
let mockPackages: PremiumPackages | null = null

const mockGetPremiumPackages = jest.fn<Promise<PremiumPackages | null>, []>(
	async () => mockPackages,
)
const mockPurchasePremium = jest.fn<Promise<'purchased' | 'cancelled' | 'error'>, [PurchasesPackage]>(
	async () => 'purchased',
)
const mockRestorePremium = jest.fn<Promise<'restored' | 'none' | 'error'>, []>(
	async () => 'restored',
)

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }))
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React = require('react') as typeof import('react')
	return {
		LinearGradient: ({ children }: { children?: import('react').ReactNode }) =>
			React.createElement(React.Fragment, null, children),
	}
})
jest.mock('@/lib/premium', () => ({
	getPremiumPackages: () => mockGetPremiumPackages(),
	purchasePremium: (pkg: PurchasesPackage) => mockPurchasePremium(pkg),
	restorePremium: () => mockRestorePremium(),
	usePremium: () => mockPremiumUnlocked,
}))

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

async function renderPaywall() {
	const screen = await render(<PaywallScreen />)
	await waitFor(() => expect(mockGetPremiumPackages).toHaveBeenCalledTimes(1))
	return screen
}

beforeEach(() => {
	jest.clearAllMocks()
	mockPremiumUnlocked = false
	mockPackages = null
})

describe('PaywallScreen', () => {
	it('未構成時は固定文言とフォールバック価格を表示し、購入ボタンを無効化する', async () => {
		const { getByText, getByTestId } = await renderPaywall()

		expect(getByText('WaiPa プレミアム')).toBeTruthy()
		expect(getByText('広告非表示')).toBeTruthy()
		expect(getByText('プレミアム限定ゲーム')).toBeTruthy()
		expect(getByText('限定お題パック')).toBeTruthy()
		expect(getByText('月額 ¥150')).toBeTruthy()
		expect(getByText('年額 ¥1,100')).toBeTruthy()
		expect(getByText('約39%お得')).toBeTruthy()
		expect(getByText('近日対応予定')).toBeTruthy()
		expect(getByTestId('paywall-purchase').props.accessibilityState).toEqual({
			disabled: true,
		})
	})

	it('閉じるボタンで前画面へ戻る', async () => {
		const { getByTestId } = await renderPaywall()

		await act(async () => {
			fireEvent.press(getByTestId('paywall-close'))
		})

		expect(router.back).toHaveBeenCalledTimes(1)
	})

	it('商品が取得できたら SDK の価格を表示し、初期選択の年額パッケージを購入する', async () => {
		const monthly = makePackage(PACKAGE_TYPE.MONTHLY, '¥180')
		const annual = makePackage(PACKAGE_TYPE.ANNUAL, '¥1,200')
		mockPackages = { monthly, annual }
		mockPurchasePremium.mockResolvedValueOnce('purchased')
		const { getByText, getByTestId } = await renderPaywall()

		expect(getByText('¥180')).toBeTruthy()
		expect(getByText('¥1,200')).toBeTruthy()

		await act(async () => {
			fireEvent.press(getByTestId('paywall-purchase'))
		})

		expect(mockPurchasePremium).toHaveBeenCalledWith(annual)
		expect(router.back).toHaveBeenCalledTimes(1)
	})

	it('月額プランを選択して購入できる', async () => {
		const monthly = makePackage(PACKAGE_TYPE.MONTHLY, '¥180')
		const annual = makePackage(PACKAGE_TYPE.ANNUAL, '¥1,200')
		mockPackages = { monthly, annual }
		const { getByText, getByTestId } = await renderPaywall()

		await act(async () => {
			fireEvent.press(getByText('月額'))
		})
		await act(async () => {
			fireEvent.press(getByTestId('paywall-purchase'))
		})

		expect(mockPurchasePremium).toHaveBeenCalledWith(monthly)
	})

	it('購入キャンセルでは何もせず、購入エラーでは Alert を表示する', async () => {
		const pkg = makePackage(PACKAGE_TYPE.ANNUAL, '¥1,200')
		mockPackages = { monthly: null, annual: pkg }
		const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
		const { getByTestId } = await renderPaywall()

		mockPurchasePremium.mockResolvedValueOnce('cancelled')
		await act(async () => {
			fireEvent.press(getByTestId('paywall-purchase'))
		})
		expect(router.back).not.toHaveBeenCalled()
		expect(alertSpy).not.toHaveBeenCalled()

		mockPurchasePremium.mockResolvedValueOnce('error')
		await act(async () => {
			fireEvent.press(getByTestId('paywall-purchase'))
		})
		expect(alertSpy).toHaveBeenCalled()
	})

	it('復元結果に応じて Alert と戻る処理を実行する', async () => {
		const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
		const { getByTestId } = await renderPaywall()

		mockRestorePremium.mockResolvedValueOnce('restored')
		await act(async () => {
			fireEvent.press(getByTestId('paywall-restore'))
		})
		expect(alertSpy).toHaveBeenCalledWith('復元しました')
		expect(router.back).toHaveBeenCalledTimes(1)

		mockRestorePremium.mockResolvedValueOnce('none')
		await act(async () => {
			fireEvent.press(getByTestId('paywall-restore'))
		})
		expect(alertSpy).toHaveBeenCalledWith('復元できる購入が見つかりませんでした')

		mockRestorePremium.mockResolvedValueOnce('error')
		await act(async () => {
			fireEvent.press(getByTestId('paywall-restore'))
		})
		expect(alertSpy).toHaveBeenCalledTimes(3)
	})

	it('既にプレミアム有効なら購入 UI の代わりに利用中表示を出す', async () => {
		mockPremiumUnlocked = true
		const { getByText, queryByTestId } = await renderPaywall()

		expect(getByText('プレミアム利用中')).toBeTruthy()
		expect(queryByTestId('paywall-purchase')).toBeNull()
	})
})
