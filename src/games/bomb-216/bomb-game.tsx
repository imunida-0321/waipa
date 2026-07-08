import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import { ResultOverlay } from '@/components/game/result-overlay'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { colors, spacing, typography } from '@/theme/tokens'
import { createBoard, hiddenCount, revealTile, type Board } from './board'
import { ExplosionOverlay } from './explosion-overlay'
import { FenceOverlay } from './fence-overlay'
import { HazardPanel } from './hazard-panel'
import { BOMB } from './theme'
import { Tile } from './tile'

const SAFE_REACTIONS = [
	'セーフ！',
	'あぶな〜い！',
	'まだまだいける！',
	'つぎ、どうぞ！',
	'ドキドキ…',
]
const INITIAL_MESSAGE = 'だれから開ける？'
const RESULT_DELAY_MS = 900

type Phase = 'play' | 'result'

// 状態機械: play（開封）→ result（爆発演出を見せてからオーバーレイ）
export function BombGame() {
	const [board, setBoard] = useState<Board>(() => createBoard())
	const [phase, setPhase] = useState<Phase>('play')
	const [message, setMessage] = useState(INITIAL_MESSAGE)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const shakeX = useSharedValue(0)

	const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }))

	const handlePress = (index: number) => {
		const { board: next, outcome } = revealTile(board, index)
		if (outcome === 'ignored') return
		setBoard(next)
		if (outcome === 'safe') {
			haptics.tap()
			playSound('tap')
			setMessage(SAFE_REACTIONS[Math.floor(Math.random() * SAFE_REACTIONS.length)])
			return
		}
		// 爆発: シェイク＋強ハプティクス＋爆発音 → 少し見せてからリザルト
		haptics.heavy()
		playSound('explosion')
		setMessage(outcome === 'solo' ? '💣 ドカン！' : '💥 大爆発！！')
		shakeX.set(
			withSequence(
				withTiming(-12, { duration: 40 }),
				withTiming(12, { duration: 40 }),
				withTiming(-8, { duration: 40 }),
				withTiming(8, { duration: 40 }),
				withTiming(0, { duration: 40 }),
			),
		)
		timerRef.current = setTimeout(() => setPhase('result'), RESULT_DELAY_MS)
	}

	const retry = () => {
		if (timerRef.current) clearTimeout(timerRef.current)
		setBoard(createBoard())
		setMessage(INITIAL_MESSAGE)
		setPhase('play')
	}

	const remaining = hiddenCount(board)
	const revealed = phase === 'result'

	const bombKindAt = (i: number): 'solo' | 'all' | null =>
		i === board.soloIndex ? 'solo' : i === board.allIndex ? 'all' : null

	return (
		<ImageBackground source={require('@/assets/images/bomb/bg.jpg')} style={styles.container}>
			{/* 文字とパネルの視認性を保つ暗めスクリム */}
			<View style={styles.scrim} />
			<View style={styles.status}>
				<Text style={styles.message}>{message}</Text>
				<Text style={styles.counter}>
					のこり {remaining}マス ／ 💣 2/{remaining}
				</Text>
			</View>
			<View style={styles.panelArea}>
				<Animated.View style={shakeStyle}>
					<HazardPanel>
						<View style={styles.grid}>
							{board.tiles.map((state, i) => (
								<Tile
									key={i}
									index={i}
									state={state}
									revealed={revealed}
									bombKind={bombKindAt(i)}
									onPress={handlePress}
								/>
							))}
						</View>
					</HazardPanel>
				</Animated.View>
			</View>

			<FenceOverlay />
			{board.exploded !== null && <ExplosionOverlay />}

			<ResultOverlay
				visible={phase === 'result'}
				onRetry={retry}
				onHome={() => router.replace('/')}
			>
				<View style={styles.result}>
					<Text style={styles.resultEmoji}>{board.exploded === 'all' ? '💥' : '💣'}</Text>
					<Text style={styles.resultTitle}>
						{board.exploded === 'all' ? '全員負け！！' : '1人負け！'}
					</Text>
					<Text style={styles.resultBody}>
						{board.exploded === 'all'
							? 'この爆弾はみんなの爆弾。全員アウト！'
							: '引いたあなたの負け…！おつかれさま！'}
					</Text>
					<Text style={styles.resultHint}>
						{board.exploded === 'all'
							? `💣（1人負け）は ${board.soloIndex + 1} 番だった`
							: `💥（全員負け）は ${board.allIndex + 1} 番だった…あぶなかった！`}
					</Text>
				</View>
			</ResultOverlay>
		</ImageBackground>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: BOMB.bg },
	scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,20,0.45)' },
	status: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
	message: { ...typography.title },
	counter: { ...typography.caption, color: colors.textMuted },
	panelArea: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: spacing.md,
		paddingBottom: spacing.xl,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	result: { alignItems: 'center', gap: spacing.md },
	resultEmoji: { fontSize: 72 },
	resultTitle: { ...typography.hero, color: BOMB.accent },
	resultBody: { ...typography.body, textAlign: 'center' },
	resultHint: { ...typography.caption, textAlign: 'center' },
})
