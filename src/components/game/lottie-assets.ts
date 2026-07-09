// Lottie 素材レジストリ。素材を入手したら null を require に差し替える。
// 例: drumrollLoop: require('@/assets/lottie/drumroll-loop.json')
// 規約（docs/superpowers/specs/2026-07-09-lottie-effects-design.md）:
// - LottieFiles 無料素材は Lottie Simple License（商用可）を確認し、出典 URL をここにコメントで残す
// - 色はカラートークン（#E85BF7→#7B5CFA、#F1C40F）に寄せる。1素材 100KB 目安
import type { LottieSource } from './lottie-effect'

export const lottieAssets = {
	/** ドラムロールのタメ（ループ再生）。素材ページに「Free to use under the Lottie Simple License」表記を確認済み */
	drumrollLoop: require('@/assets/lottie/drumroll-loop.json') as LottieSource,
	/** 発表瞬間の紙吹雪・キラキラ（1回再生）。素材ページに「Free to use under the Lottie Simple License」表記を確認済み */
	celebrate: require('@/assets/lottie/celebrate.json') as LottieSource,
	/** きまぐれ◯×カットインの背景（1回再生） */
	cutinFlash: null as LottieSource | null,
}
