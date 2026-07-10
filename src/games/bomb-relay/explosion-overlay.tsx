import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { lottieAssets } from '@/components/game/lottie-assets'
import { LottieEffect } from '@/components/game/lottie-effect'
import { GradientButton } from '@/components/ui/gradient-button'
import { PillButton } from '@/components/ui/pill-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { spacing, typography } from '@/theme/tokens'
import { BR } from './theme'

export const EXPLOSION_HOLD_MS = 1600

type Props = {
	onRetry: () => void
	onHome: () => void
}

// 爆発の瞬間: 赤フラッシュ＋Lottie＋大音量＋強バイブ → ひと呼吸おいてボタンを出す
export function ExplosionOverlay({ onRetry, onHome }: Props) {
	const [showActions, setShowActions] = useState(false)
	const flash = useSharedValue(1)

	useEffect(() => {
		playSound('explosion')
		haptics.heavy()
		flash.value = withTiming(0, { duration: 600 })
		const t = setTimeout(() => setShowActions(true), EXPLOSION_HOLD_MS)
		return () => clearTimeout(t)
	}, [flash])

	const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }))

	return (
		<View style={styles.backdrop}>
			<Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
			<LottieEffect
				source={lottieAssets.explosion}
				style={styles.lottie}
				fallback={<Text style={styles.boomEmoji}>💥</Text>}
			/>
			<Text style={styles.loser}>💥 今持ってる人の負け！</Text>
			{showActions && (
				<View style={styles.actions}>
					<GradientButton title="もう一回" onPress={onRetry} />
					<PillButton title="ホームへ" onPress={onHome} />
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10,8,24,0.94)',
		alignItems: 'stretch',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.lg,
	},
	flash: {
		...StyleSheet.absoluteFill,
		backgroundColor: BR.flash,
	},
	lottie: { alignSelf: 'center', width: 220, height: 220 },
	boomEmoji: { fontSize: 96, textAlign: 'center' },
	loser: { ...typography.hero, textAlign: 'center' },
	actions: { gap: spacing.md, alignItems: 'stretch' },
})
