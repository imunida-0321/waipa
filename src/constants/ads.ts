import { Platform } from 'react-native'
import { TestIds } from 'react-native-google-mobile-ads'

// インタースティシャルを何回のゲーム退出ごとに出すか（1 = 毎回）。
// 頻度を緩める場合はこの定数だけ変える（将来 Supabase 経由で上書き可能にする想定）
export const INTERSTITIAL_EVERY_N_EXITS = 1

// 本番ユニット ID（AdMob コンソール 2026-07-19 発行）。iOS / Android で ID が異なる。
// 開発ビルドは TestIds に自動切替（本番 ID を開発端末で表示すると無効トラフィック扱いのため）
function unit(ios: string, android: string): string {
	return Platform.select({ ios, android, default: ios })
}

export const AD_UNIT_IDS = {
	homeBanner: __DEV__
		? TestIds.ADAPTIVE_BANNER
		: unit('ca-app-pub-7417453193360731/3169086799', 'ca-app-pub-7417453193360731/2574190426'),
	gameExitInterstitial: __DEV__
		? TestIds.INTERSTITIAL
		: unit('ca-app-pub-7417453193360731/6182951302', 'ca-app-pub-7417453193360731/3333306544'),
	packUnlockRewarded: __DEV__
		? TestIds.REWARDED
		: unit('ca-app-pub-7417453193360731/9159780077', 'ca-app-pub-7417453193360731/7080411642'),
	trialRewarded: __DEV__
		? TestIds.REWARDED
		: unit('ca-app-pub-7417453193360731/8453203068', 'ca-app-pub-7417453193360731/9515571511'),
}
