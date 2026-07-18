import type * as AdsMock from '../../../__mocks__/react-native-google-mobile-ads'
import {
	getTrackingPermissionsAsync,
	PermissionStatus,
	requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency'
import { adsEnabled, initAds, maybeShowGameExitInterstitial, _resetForTest } from '@/lib/ads'
import { isPremiumUnlocked } from '@/lib/premium'

// ファクトリなしの jest.mock はルート __mocks__ の手動モックを使う
// （jest-expo では自動適用されないため、テスト対象と同一インスタンスを共有するには明示が必要）
jest.mock('react-native-google-mobile-ads')
jest.mock('expo-tracking-transparency')
jest.mock('@/lib/premium', () => ({ isPremiumUnlocked: jest.fn(() => false) }))

const adsMock = jest.requireMock('react-native-google-mobile-ads') as typeof AdsMock
const mockedPremium = jest.mocked(isPremiumUnlocked)
const mockedGetAtt = jest.mocked(getTrackingPermissionsAsync)
const mockedRequestAtt = jest.mocked(requestTrackingPermissionsAsync)

function attResponse(status: PermissionStatus) {
	return {
		status,
		granted: status === PermissionStatus.GRANTED,
		canAskAgain: true,
		expires: 'never' as const,
	}
}

beforeEach(() => {
	jest.clearAllMocks()
	adsMock._resetAdsMock()
	_resetForTest()
	mockedPremium.mockReturnValue(false)
	mockedGetAtt.mockResolvedValue(attResponse(PermissionStatus.UNDETERMINED))
})

describe('adsEnabled', () => {
	it('プレミアムなら false、非プレミアムなら true', () => {
		expect(adsEnabled()).toBe(true)
		mockedPremium.mockReturnValue(true)
		expect(adsEnabled()).toBe(false)
	})
})

describe('initAds', () => {
	it('ATT 未回答なら許可リクエスト → AdMob 初期化の順で実行する', async () => {
		await initAds()
		expect(mockedRequestAtt).toHaveBeenCalledTimes(1)
		expect(adsMock._initialize).toHaveBeenCalledTimes(1)
		const attOrder = mockedRequestAtt.mock.invocationCallOrder[0]
		const initOrder = adsMock._initialize.mock.invocationCallOrder[0]
		expect(attOrder).toBeLessThan(initOrder)
	})

	it('ATT 回答済みなら許可リクエストを出さない', async () => {
		mockedGetAtt.mockResolvedValue(attResponse(PermissionStatus.GRANTED))
		await initAds()
		expect(mockedRequestAtt).not.toHaveBeenCalled()
		expect(adsMock._initialize).toHaveBeenCalledTimes(1)
	})

	it('プレミアムなら何もしない', async () => {
		mockedPremium.mockReturnValue(true)
		await initAds()
		expect(mockedGetAtt).not.toHaveBeenCalled()
		expect(adsMock._initialize).not.toHaveBeenCalled()
	})

	it('2回呼んでも初期化は1回だけ', async () => {
		await initAds()
		await initAds()
		expect(adsMock._initialize).toHaveBeenCalledTimes(1)
	})

	it('初期化後にインタースティシャルを先読みする', async () => {
		await initAds()
		expect(adsMock.InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1)
		expect(adsMock._interstitials[0]?.load).toHaveBeenCalledTimes(1)
	})
})

describe('maybeShowGameExitInterstitial', () => {
	it('ロード済みなら退出ごとに表示し、表示後に再読込する', async () => {
		await initAds()
		const first = adsMock._interstitials[0]
		first._emit('loaded')
		maybeShowGameExitInterstitial()
		expect(first.show).toHaveBeenCalledTimes(1)
		first._emit('closed')
		expect(adsMock.InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(2)
		expect(adsMock._interstitials[1]?.load).toHaveBeenCalledTimes(1)
	})

	it('未ロードなら表示しない（クラッシュもしない）', async () => {
		await initAds()
		maybeShowGameExitInterstitial()
		expect(adsMock._interstitials[0]?.show).not.toHaveBeenCalled()
	})

	it('プレミアムなら何もしない', async () => {
		await initAds()
		adsMock._interstitials[0]._emit('loaded')
		mockedPremium.mockReturnValue(true)
		maybeShowGameExitInterstitial()
		expect(adsMock._interstitials[0].show).not.toHaveBeenCalled()
	})

	it('初期化前に呼ばれても何もしない', () => {
		expect(() => maybeShowGameExitInterstitial()).not.toThrow()
	})
})
