import { AD_UNIT_IDS, INTERSTITIAL_EVERY_N_EXITS } from '@/constants/ads'
import {
	getTrackingPermissionsAsync,
	PermissionStatus,
	requestTrackingPermissionsAsync,
} from '@/lib/att'
import mobileAds, { AdEventType, InterstitialAd } from '@/lib/gma'
import { isPremiumUnlocked } from '@/lib/premium'

// プレミアム購読者には一切広告を出さない。判定源は isPremiumUnlocked() のみ
export function adsEnabled(): boolean {
	return !isPremiumUnlocked()
}

let initialized = false
let interstitial: InterstitialAd | null = null
let interstitialLoaded = false
let interstitialFailed = false
let playExitCount = 0

// 初回起動時（ホーム表示直後）に1回だけ呼ぶ。ATT → AdMob 初期化 → 先読み
export async function initAds(): Promise<void> {
	if (initialized || !adsEnabled()) return
	initialized = true
	const { status } = await getTrackingPermissionsAsync()
	if (status === PermissionStatus.UNDETERMINED) {
		await requestTrackingPermissionsAsync()
	}
	await mobileAds().initialize()
	preloadInterstitial()
}

function preloadInterstitial() {
	// v17 では命令的に作った広告の後始末は呼び出し側の責任。作り直す前に使い終わった広告を破棄する
	interstitial?.destroy()
	interstitialLoaded = false
	interstitialFailed = false
	interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.gameExitInterstitial)
	interstitial.addAdEventListener(AdEventType.LOADED, () => {
		interstitialLoaded = true
		interstitialFailed = false
	})
	interstitial.addAdEventListener(AdEventType.ERROR, () => {
		interstitialLoaded = false
		interstitialFailed = true
	})
	// 表示後は次の退出に備えて再読込
	interstitial.addAdEventListener(AdEventType.CLOSED, preloadInterstitial)
	interstitial.load()
}

// GameScreen の play ステージ退出時に呼ぶ。N 回ごとに表示（初期値 1 = 毎回）
export function maybeShowGameExitInterstitial(): void {
	if (!initialized || !adsEnabled()) return
	playExitCount += 1
	if (playExitCount % INTERSTITIAL_EVERY_N_EXITS !== 0) return
	if (interstitialLoaded && interstitial) {
		interstitialLoaded = false
		// v17.2 以降、未ロード・表示中・表示拒否は Promise の reject で返る。
		// 未処理の reject にせず、表示できなかった広告は破棄して次の退出に備えて読み込み直す
		interstitial.show().catch(preloadInterstitial)
		return
	}
	if (interstitialFailed) {
		preloadInterstitial()
	}
}

// テスト用: モジュール状態を初期化
export function _resetForTest() {
	initialized = false
	interstitial = null
	interstitialLoaded = false
	interstitialFailed = false
	playExitCount = 0
}
