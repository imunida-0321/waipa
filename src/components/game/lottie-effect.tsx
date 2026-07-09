import { useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import LottieView from 'lottie-react-native'

export type LottieSource = ComponentProps<typeof LottieView>['source']

type Props = {
	/** lottie-assets.ts のエントリ。null なら fallback を表示 */
	source: LottieSource | null
	loop?: boolean
	/** 素材なし・読み込み失敗時に表示する既存演出 */
	fallback?: ReactNode
	style?: StyleProp<ViewStyle>
}

// Lottie 素材があれば再生し、なければ fallback（既存の reanimated 演出）を出す薄いラッパー。
// 素材は assets/lottie/ に置き、lottie-assets.ts の null を require に差し替えて有効化する
export function LottieEffect({ source, loop = false, fallback = null, style }: Props) {
	const [failed, setFailed] = useState(false)

	if (source === null || failed) return <>{fallback}</>

	// 装飾専用。下の UI（ボタン等）のタップを遮らない。
	// Web 版 LottieView は style を無視して webStyle しか見ないため、同内容を両方に渡す
	const flat = StyleSheet.flatten([style, { pointerEvents: 'none' as const }])

	return (
		<LottieView
			source={source}
			autoPlay
			loop={loop}
			style={flat}
			webStyle={flat as CSSProperties}
			onAnimationFailure={() => setFailed(true)}
		/>
	)
}
