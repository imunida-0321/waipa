// web 用 no-op スタブ。Metro の platform 拡張子解決で web ビルド時のみ gma.ts の代わりに使われる。
// react-native-google-mobile-ads はネイティブ専用 (codegenNativeComponent) で web バンドルを壊すため、
// web では広告を一切表示せず全 API を no-op にして画面遷移のスモークだけ成立させる
type Listener = (payload?: unknown) => void

const noop = () => {}

export default function mobileAds() {
	return {
		initialize: async (): Promise<unknown[]> => [],
	}
}

export const TestIds = {
	ADAPTIVE_BANNER: 'web-stub-adaptive-banner',
	INTERSTITIAL: 'web-stub-interstitial',
	REWARDED: 'web-stub-rewarded',
}

export const AdEventType = { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed' }

export const BannerAdSize = { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' }

type StubAd = {
	addAdEventListener: (type: string, listener: Listener) => () => void
	load: () => void
	show: () => void
}

export const InterstitialAd = {
	createForAdRequest(_unitId: string): StubAd {
		return { addAdEventListener: () => noop, load: noop, show: noop }
	},
}

export function BannerAd(_props: { unitId: string; size: string }): null {
	return null
}

// isLoaded が常に false なので「動画を見て〜」ボタンは disabled のまま。
// 毎レンダー同一参照を返し、呼び出し元 useEffect の依存配列 (load) で再実行を起こさない
const rewardedAdStub = {
	isLoaded: false,
	isEarnedReward: false,
	error: undefined,
	load: noop,
	show: noop,
}

export function useRewardedAd(_unitId: string) {
	return rewardedAdStub
}
