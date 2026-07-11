// プレミアム解放判定。RevenueCat (#7) 結線までのスタブで、
// 開発ビルドは解放（プレイ確認用）・本番ビルドは全ロック（アプリ未リリースのため実害なし）。
// #7 では CustomerInfo 参照への差し替えをこの1関数に集約する
export function isPremiumUnlocked(): boolean {
	return __DEV__
}
