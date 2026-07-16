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
	/** きまぐれ◯×カットインの背景（1回再生）。素材ページに「Free to use under the Lottie Simple License」表記を確認済み */
	cutinFlash: require('@/assets/lottie/cutin-flash.json') as LottieSource,
	/** 爆弾リレーの爆発（1回再生）。素材ページに「Free to use under the Lottie Simple License」表記を確認済み */
	explosion: require('@/assets/lottie/explosion.json') as LottieSource,
	/** 乾杯ウルフ「外したので乾杯！」の乾杯アニメ（ループ再生）。ユーザー提供素材（2026-07-16 受領・ライセンスは提供者確認） */
	cheers: require('@/assets/lottie/cheers.json') as LottieSource,
	/** 爆弾リレーの導火線爆弾（ループ再生）。LottieFiles 由来のユーザー提供素材（2026-07-11 受領・ライセンスは提供者確認） */
	bombTicking: require('@/assets/lottie/bomb-ticking.json') as LottieSource,
}
