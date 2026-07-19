import { router } from 'expo-router'
import { useEffect, useReducer, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { lottieAssets } from '@/components/game/lottie-assets'
import { LottieEffect } from '@/components/game/lottie-effect'
import { useDrumroll } from '@/components/game/use-drumroll'
import { haptics } from '@/lib/haptics'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playSound } from '@/lib/sound'
import { useTrialRoundConsumer } from '@/lib/trial-store'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { createInitialState, MINE_MAX, MINE_MIN, reduce } from './engine'
import { SwipeGauge } from './gauge'
import { RoundResult } from './round-result'
import { BS } from './theme'

// スワイプ度胸試し: ゲージを上へスワイプ、離した位置がスコア。
// ただしプレイヤーごとの地雷位置（60〜95・非表示）以上で爆発
export function BombSwipeGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, (count) =>
		createInitialState(count, Math.random),
	)
	useTrialRoundConsumer('bomb-swipe', state.phase === 'result')
	// スワイプ中の緊張演出用。ゲージ内部と重複して持つが、親は演出にだけ使う
	const [liveScore, setLiveScore] = useState(0)
	// 直近で心音を鳴らした10点バケット（Math.floor(score / 10)）。
	// responderMove は同じバケット内でも高頻度に呼ばれるため、バケットが
	// 上昇して跨いだ瞬間だけ鳴らす（手番開始・リリース時にリセット）
	const lastHeartbeatBucket = useRef(0)

	const drum = useDrumroll()

	// 爆発: 音＋強バイブ。心音はスコア更新側で鳴らす（heartbeat 未収録の間は無音スキップ）
	// 注意: drum は useDrumroll() が毎レンダー新規オブジェクトを返すため、
	// 依存配列には drum 自体ではなく安定した drum.start（useCallback）を渡す
	useEffect(() => {
		if (state.phase === 'exploded') {
			playSound('explosion')
			haptics.heavy()
		}
		if (state.phase === 'result') {
			drum.start()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.phase, drum.start])

	const onScoreChange = (score: number) => {
		setLiveScore(score)
		// 10点バケットを跨いで上昇したときだけ心音＋軽バイブ（同一バケット内の
		// 連打や、跨いだのに鳴らない取りこぼしを防ぐため % ではなくバケット比較で判定）
		const bucket = Math.floor(score / 10)
		if (score > 0 && bucket > lastHeartbeatBucket.current) {
			playSound('heartbeat')
			haptics.tap()
		}
		lastHeartbeatBucket.current = bucket
	}

	const onRelease = (score: number) => {
		setLiveScore(0)
		lastHeartbeatBucket.current = 0
		dispatch({ type: 'release', score })
	}

	const retry = () => {
		drum.reset()
		dispatch({ type: 'restart', rng: Math.random })
	}

	const result = state.results[state.turnIndex]
	const turnColor = playerColor(state.turnIndex).value

	if (state.phase === 'result') {
		return (
			<View style={styles.container}>
				<DrumrollReveal phase={drum.phase === 'idle' ? 'rolling' : drum.phase}>
					<RoundResult
						state={state}
						names={names}
						onRetry={retry}
						onHome={() => router.replace('/')}
					/>
				</DrumrollReveal>
			</View>
		)
	}

	if (state.phase === 'exploded') {
		return (
			<View style={[styles.container, styles.explodedBg]}>
				<LottieEffect
					source={lottieAssets.explosion}
					style={styles.explosionLottie}
					fallback={<Text style={styles.explosionEmoji}>💥</Text>}
				/>
				<Text style={styles.resultScore}>{result?.score}</Text>
				<Text style={styles.title}>
					爆発！ 地雷は {state.mines[state.turnIndex]} だった…
				</Text>
				<NextButton onPress={() => dispatch({ type: 'next' })} />
			</View>
		)
	}

	if (state.phase === 'safe') {
		return (
			<View style={styles.container}>
				<Text style={styles.resultScore}>{result?.score}</Text>
				<Text style={styles.title}>セーフ！</Text>
				<NextButton onPress={() => dispatch({ type: 'next' })} />
			</View>
		)
	}

	if (state.phase === 'swiping') {
		return (
			<View style={styles.container}>
				<View
					pointerEvents="none"
					testID="tension-mask"
					style={[styles.tensionMask, { opacity: (liveScore / 100) * 0.45 }]}
				/>
				<Text style={styles.hint}>
					地雷は {MINE_MIN}〜{MINE_MAX} のどこか…
				</Text>
				<SwipeGauge onScoreChange={onScoreChange} onRelease={onRelease} />
			</View>
		)
	}

	// handoff
	return (
		<View style={styles.container}>
			<View style={styles.turnRow}>
				<View style={[styles.turnBar, { backgroundColor: turnColor }]} />
				<Text style={styles.turnText}>{names[state.turnIndex]}さんの番</Text>
			</View>
			<Text style={styles.hint}>スマホを受け取ったら開始しよう</Text>
			<Pressable
				accessibilityRole="button"
				onPress={() => {
					haptics.tap()
					lastHeartbeatBucket.current = 0
					dispatch({ type: 'startSwipe' })
				}}
				style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
			>
				<Text style={styles.startBtnText}>スワイプ開始</Text>
			</Pressable>
		</View>
	)
}

function NextButton({ onPress }: { onPress: () => void }) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => {
				haptics.tap()
				onPress()
			}}
			style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
		>
			<Text style={styles.startBtnText}>次へ</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: spacing.lg,
		gap: spacing.lg,
		justifyContent: 'center',
	},
	tensionMask: {
		...StyleSheet.absoluteFill,
		backgroundColor: BS.maskRed,
	},
	explodedBg: { backgroundColor: BS.maskRed },
	explosionLottie: { width: 160, height: 160, alignSelf: 'center' },
	explosionEmoji: { fontSize: 96, textAlign: 'center' },
	hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
	title: { ...typography.title, textAlign: 'center' },
	resultScore: { fontSize: 96, fontWeight: '800', color: colors.text, textAlign: 'center' },
	turnRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		alignSelf: 'center',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	turnBar: { width: 4, height: 24, borderRadius: 2 },
	turnText: { ...typography.body, color: colors.text },
	startBtn: {
		alignSelf: 'center',
		backgroundColor: BS.red,
		borderRadius: radii.pill,
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.md,
	},
	startBtnText: { ...typography.body, fontWeight: '800', color: colors.text },
	pressed: { opacity: 0.8 },
})
