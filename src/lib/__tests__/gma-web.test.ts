// web 用スタブ (gma.web.ts) の挙動。Metro が web ビルド時にのみ解決するため、
// jest からは拡張子付きで直接 import して検証する
import mobileAds, {
	AdEventType,
	BannerAd,
	BannerAdSize,
	InterstitialAd,
	TestIds,
	useRewardedAd,
} from '../gma.web'

describe('gma.web (web 向け no-op スタブ)', () => {
	it('mobileAds().initialize() が resolve する', async () => {
		await expect(mobileAds().initialize()).resolves.toBeDefined()
	})

	it('InterstitialAd.createForAdRequest が no-op の広告オブジェクトを返す', () => {
		const ad = InterstitialAd.createForAdRequest('unit-id')
		expect(() => {
			const unsubscribe = ad.addAdEventListener(AdEventType.LOADED, () => {})
			ad.load()
			ad.show()
			unsubscribe()
		}).not.toThrow()
	})

	it('BannerAd は何も描画しない (null を返す)', () => {
		expect(
			BannerAd({ unitId: 'unit-id', size: BannerAdSize.ANCHORED_ADAPTIVE_BANNER }),
		).toBeNull()
	})

	it('useRewardedAd は常に未ロード状態を返し load/show が例外を投げない', () => {
		const hook = useRewardedAd('unit-id')
		expect(hook.isLoaded).toBe(false)
		expect(hook.isEarnedReward).toBe(false)
		expect(() => {
			hook.load()
			hook.show()
		}).not.toThrow()
	})

	it('TestIds を提供する (constants/ads.ts が参照)', () => {
		expect(typeof TestIds.ADAPTIVE_BANNER).toBe('string')
		expect(typeof TestIds.INTERSTITIAL).toBe('string')
		expect(typeof TestIds.REWARDED).toBe('string')
	})
})
