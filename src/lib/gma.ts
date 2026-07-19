// react-native-google-mobile-ads の platform 分岐ラッパー。
// web ビルドでは Metro が gma.web.ts (no-op スタブ) を解決し、ネイティブ専用 SDK をバンドルしない。
// プロダクションコードは SDK を直接 import せず必ずここを経由する (gma-boundary.test.ts が強制)
export {
	default,
	AdEventType,
	BannerAd,
	BannerAdSize,
	InterstitialAd,
	TestIds,
	useRewardedAd,
} from 'react-native-google-mobile-ads'
