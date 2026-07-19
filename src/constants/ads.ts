import { TestIds } from 'react-native-google-mobile-ads'

// インタースティシャルを何回のゲーム退出ごとに出すか（1 = 毎回）。
// 頻度を緩める場合はこの定数だけ変える（将来 Supabase 経由で上書き可能にする想定）
export const INTERSTITIAL_EVERY_N_EXITS = 1

// 本番ユニット ID は AdMob コンソール発行後に差し替える（リリース前チェックリスト）
export const AD_UNIT_IDS = {
	homeBanner: __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-XXXX/home-banner',
	gameExitInterstitial: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-XXXX/game-exit',
	packUnlockRewarded: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-XXXX/pack-unlock',
}
