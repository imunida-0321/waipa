import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import { lottieAssets } from '@/components/game/lottie-assets'
import { LottieEffect } from '@/components/game/lottie-effect'
import { GlassSurface } from '@/components/ui/glass-surface'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { useTopics, type Topic } from '@/lib/topics-store'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { nextTickDelay, pickFuseMs } from './engine'
import { ExplosionOverlay } from './explosion-overlay'
import { BR } from './theme'
import { pickTalkTopic } from './topics'

type Phase = 'ready' | 'ticking' | 'exploded'

// 状態機械: ready（お題確認）→ ticking（加速チクタク・残り時間非表示）→ exploded（敗者宣言）
export function BombRelayGame() {
	const { topics } = useTopics()
	const [phase, setPhase] = useState<Phase>('ready')
	const [topic, setTopic] = useState<Topic>(() => pickTalkTopic(topics, [], Math.random))
	// 初回レンダー時点の topic はすでに確定しているので、ref 初期値でそのまま使用済み登録できる
	const usedIdsRef = useRef<string[]>([topic.id])
	const fuseRef = useRef(0)

	useEffect(() => {
		if (phase !== 'ticking') return
		const startedAt = Date.now()
		let tickTimer: ReturnType<typeof setTimeout> | null = null
		const scheduleTick = () => {
			tickTimer = setTimeout(
				() => {
					playSound('tick') // 素材未登録の間は無音スキップ（バイブは鳴る）
					haptics.tap()
					scheduleTick()
				},
				nextTickDelay(Date.now() - startedAt, fuseRef.current),
			)
		}
		scheduleTick()
		const boom = setTimeout(() => setPhase('exploded'), fuseRef.current)
		return () => {
			if (tickTimer) clearTimeout(tickTimer)
			clearTimeout(boom)
		}
	}, [phase])

	// 🧨 は ticking 中だけ脈打つ
	const pulse = useSharedValue(1)
	useEffect(() => {
		if (phase === 'ticking') {
			pulse.value = withRepeat(
				withSequence(withTiming(1.18, { duration: 300 }), withTiming(1, { duration: 300 })),
				-1,
			)
		} else {
			pulse.value = withTiming(1, { duration: 120 })
		}
	}, [phase, pulse])
	const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))

	const start = () => {
		fuseRef.current = pickFuseMs(Math.random)
		setPhase('ticking')
	}

	const retry = () => {
		const next = pickTalkTopic(topics, usedIdsRef.current, Math.random)
		usedIdsRef.current = [...usedIdsRef.current, next.id]
		setTopic(next)
		setPhase('ready')
	}

	return (
		<View style={styles.container}>
			<GlassSurface style={styles.topicCard}>
				<Text style={styles.topicLabel}>お題</Text>
				<Text style={styles.topicText}>{topic.text}</Text>
			</GlassSurface>

			{/* 素材があれば Lottie の爆弾、なければ従来の🧨。どちらも ticking 中は脈打つ */}
			<Animated.View style={pulseStyle}>
				<LottieEffect
					source={lottieAssets.bombTicking}
					loop
					style={styles.bombLottie}
					fallback={<Text style={styles.bomb}>🧨</Text>}
				/>
			</Animated.View>

			{phase === 'ready' ? (
				<GradientButton title="スタート" onPress={start} />
			) : (
				<Text style={styles.hint}>答えたら次の人へ回せ！</Text>
			)}

			{phase === 'exploded' && (
				<ExplosionOverlay onRetry={retry} onHome={() => router.replace('/')} />
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: spacing.lg,
		gap: spacing.xl,
		justifyContent: 'center',
	},
	topicCard: {
		borderWidth: 1,
		borderColor: BR.purple,
		borderRadius: radii.lg,
		padding: spacing.lg,
		gap: spacing.xs,
	},
	topicLabel: { ...typography.caption, color: BR.purple, textAlign: 'center' },
	topicText: { ...typography.title, textAlign: 'center', lineHeight: 32 },
	bomb: { fontSize: 96, textAlign: 'center' },
	bombLottie: { width: 180, height: 180, alignSelf: 'center' },
	hint: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
})
