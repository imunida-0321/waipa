import { AD_UNIT_IDS, INTERSTITIAL_EVERY_N_EXITS } from '@/constants/ads'
import {
	getTrackingPermissionsAsync,
	PermissionStatus,
	requestTrackingPermissionsAsync,
} from '@/lib/att'
import { createStore, useStore } from '@/lib/create-store'
import mobileAds, { AdEventType, InterstitialAd } from '@/lib/gma'
import { isPremiumUnlocked, subscribePremium, usePremium } from '@/lib/premium'

// プレミアム購読者には一切広告を出さない。判定源は isPremiumUnlocked() のみ
export function adsEnabled(): boolean {
	return !isPremiumUnlocked()
}

// AdMob の初期化が済んだかどうか。initAds() はプレミアムなら初期化しないので、購読者では false のまま
const readyStore = createStore(false)

// 常設の広告枠（ホームのバナー）の表示判定。初期化が済むまでは出さず、購読状態の変化にも追従する
export function useAdsEnabled(): boolean {
	const ready = useStore(readyStore)
	const premiumUnlocked = usePremium()
	return ready && !premiumUnlocked
}

let initialized = false
let watchingPremium = false
let interstitial: InterstitialAd | null = null
let interstitialLoaded = false
let interstitialFailed = false
let playExitCount = 0

// 起動時、購読状態が確定したあとに呼ぶ（冒頭の adsEnabled() の判定が購読状態を反映するように）。
// ATT → AdMob 初期化 → 先読み。初期化は1回だけで、プレミアムなら何もしない
export async function initAds(): Promise<void> {
	if (initialized) return
	watchPremium()
	if (!adsEnabled()) return
	initialized = true
	const { status } = await getTrackingPermissionsAsync()
	if (status === PermissionStatus.UNDETERMINED) {
		await requestTrackingPermissionsAsync()
	}
	await mobileAds().initialize()
	readyStore.setState(true)
	preloadInterstitial()
}

// 購読者として起動すると initAds() は何もせずに終わる。そのあとで購読が切れたときに広告を出せるよう、
// 購読状態が変わるたびに initAds() を呼び直す（初期化済みかプレミアムなら何もしないので、何度呼んでもよい）
function watchPremium() {
	if (watchingPremium) return
	watchingPremium = true
	subscribePremium(() => {
		void initAds()
	})
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
	watchingPremium = false
	readyStore.setState(false)
	interstitial = null
	interstitialLoaded = false
	interstitialFailed = false
	playExitCount = 0
}
