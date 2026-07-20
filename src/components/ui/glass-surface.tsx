import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import type { PropsWithChildren } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { glass, radii } from '@/theme/tokens'

export type GlassVariant = 'card' | 'overlay'
export type GlassMode = 'native' | 'blur' | 'pseudo'

type GlassEnv = { liquidGlass: boolean; os: typeof Platform.OS }

// 起動環境は実行中に変わらないため、ネイティブ判定はモジュール読込時に1回だけ行う
const ENV: GlassEnv = { liquidGlass: isLiquidGlassAvailable(), os: Platform.OS }

// ガラス描画方式の唯一の分岐点。
// Android の BlurView は高負荷のため、常設 UI（card）は blur を使わず疑似ガラスに落とす
export function resolveGlassMode(variant: GlassVariant, env: GlassEnv = ENV): GlassMode {
	if (env.liquidGlass) return 'native'
	if (env.os === 'web') return 'pseudo'
	return variant === 'overlay' ? 'blur' : 'pseudo'
}

type Props = PropsWithChildren<{
	style?: StyleProp<ViewStyle>
	variant?: GlassVariant
}>

// ガラス面の共通土台。iOS 26+ はネイティブ Liquid Glass、
// それ以外は blur（overlay のみ）/ 疑似ガラスにフォールバックする
export function GlassSurface({ children, style, variant = 'card' }: Props) {
	const mode = resolveGlassMode(variant)
	if (mode === 'native') {
		return (
			<GlassView
				testID="glass-surface-native"
				glassEffectStyle="regular"
				tintColor={glass.tint}
				colorScheme="dark"
				style={[styles.base, style]}
			>
				{children}
			</GlassView>
		)
	}
	if (mode === 'blur') {
		return (
			<BlurView
				testID="glass-surface-blur"
				tint="dark"
				intensity={glass.blurIntensity}
				experimentalBlurMethod="dimezisBlurView"
				style={[styles.base, styles.bordered, style]}
			>
				<View style={styles.blurTint} pointerEvents="none" />
				{children}
			</BlurView>
		)
	}
	return (
		<View
			testID="glass-surface-pseudo"
			style={[styles.base, styles.bordered, styles.pseudoFill, style]}
		>
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	base: { borderRadius: radii.lg, overflow: 'hidden' },
	bordered: { borderWidth: 1, borderColor: glass.borderHighlight },
	blurTint: { ...StyleSheet.absoluteFill, backgroundColor: glass.tint },
	pseudoFill: { backgroundColor: glass.fallbackFill },
})
