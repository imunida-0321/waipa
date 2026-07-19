import { router } from 'expo-router'
import { useEffect, useReducer, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GradientButton } from '@/components/ui/gradient-button'
import { IsoDie } from '@/games/chinchiro/iso-die'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { useTrialRoundConsumer } from '@/lib/trial-store'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { DeclareList } from './declare-list'
import { DiceRoll3D, ROLL_ANIM_MS } from './dice-roll-3d'
import { declarationLabel, type Rng } from './engine'
import { LivesBar } from './lives-bar'
import { initialState, reduce } from './reducer'
import { RespondScreen } from './respond-screen'
import { ResultScreen } from './result-screen'
import { RevealOverlay } from './reveal-overlay'
import { DD } from './theme'
import { useShake } from './use-shake'

// rollId をシードにした決定的疑似乱数（dice-roll-3d.tsx の mulberry32 と同等実装）
function mulberry32(seed: number): () => number {
	let s = seed >>> 0
	return () => {
		s = (s + 0x6d2b79f5) >>> 0
		let t = s
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// rollId シードの決定的ダミー出目（転がり演出用）。実出目は長押し確認と公開時のみ表示する
function dummyDice(rollId: number): [number, number] {
	const rng = mulberry32(rollId)
	const a = Math.floor(rng() * 6) + 1
	const b = Math.floor(rng() * 6) + 1
	return [a, b]
}

const rng: Rng = () => Math.random()

export function DautDiceGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [state, dispatch] = useReducer(reduce, players.count, initialState)
	useTrialRoundConsumer('daut-dice', state.phase === 'result')

	// haptics はボタン経由なら GradientButton 内蔵の tap に任せる（シェイク時のみ明示発火）
	const doRoll = () => {
		playSound('diceRoll1')
		dispatch({ type: 'roll', rng })
	}
	useShake(state.phase === 'roll', () => {
		haptics.tap()
		doRoll()
	})

	return (
		<View style={styles.container}>
			<LivesBar names={names} lives={state.lives} turnIndex={state.turnIndex} />

			{state.phase === 'roll' && (
				<View style={styles.body}>
					<Text style={styles.turn}>{names[state.turnIndex]}さんの番</Text>
					<DiceRoll3D
						dice={dummyDice(state.rollId)}
						rolling={false}
						rollId={state.rollId}
					/>
					<GradientButton title="タップで振る" onPress={doRoll} />
					<Text style={styles.hint}>または端末をシェイク！</Text>
				</View>
			)}

			{state.phase === 'peek' && state.actualRoll && (
				<PeekBody
					rollId={state.rollId}
					actual={state.actualRoll}
					onDeclare={() => dispatch({ type: 'toDeclare' })}
				/>
			)}

			{state.phase === 'declare' && (
				<View style={styles.body}>
					<Text style={styles.hint}>
						直前の宣言:{' '}
						{state.prevDeclaration === null
							? 'なし'
							: declarationLabel(state.prevDeclaration)}
					</Text>
					<DeclareList
						prev={state.prevDeclaration}
						onDeclare={(value) => dispatch({ type: 'declare', value })}
					/>
				</View>
			)}

			{state.phase === 'handover' && (
				<View style={styles.body}>
					<Text style={styles.turn}>📲 {names[state.turnIndex]}さんへスマホを渡して</Text>
					{state.handoverNext === 'respond' && state.prevDeclaration !== null && (
						<Text style={styles.bigDeclaration}>
							宣言: {declarationLabel(state.prevDeclaration)}
						</Text>
					)}
					<GradientButton
						title="渡した"
						onPress={() => dispatch({ type: 'handedOver' })}
					/>
				</View>
			)}

			{state.phase === 'respond' && state.prevDeclaration !== null && (
				<View style={styles.body}>
					<RespondScreen
						declarerName={names[state.prevDeclarerIndex ?? 0]}
						declaration={state.prevDeclaration}
						onDoubt={() => dispatch({ type: 'doubt' })}
						onBelieve={() => dispatch({ type: 'believe' })}
					/>
				</View>
			)}

			{state.phase === 'reveal' &&
				state.reveal &&
				state.prevDeclaration !== null &&
				state.actualRoll && (
					<RevealOverlay
						declaration={state.prevDeclaration}
						actual={state.actualRoll}
						wasBluff={state.reveal.wasBluff}
						lifeLoserName={names[state.reveal.lifeLoserIndex]}
						gameOver={state.loserIndex !== null}
						onDone={() => dispatch({ type: 'revealDone' })}
					/>
				)}

			{state.phase === 'result' && state.loserIndex !== null && (
				<ResultScreen
					names={names}
					lives={state.lives}
					loserIndex={state.loserIndex}
					onRetry={() => dispatch({ type: 'retry' })}
					onHome={() => router.replace('/')}
				/>
			)}
		</View>
	)
}

// peek フェーズの本体。転がり演出（ダミー）→ 長押し確認 → 宣言へ
function PeekBody({
	rollId,
	actual,
	onDeclare,
}: {
	rollId: number
	actual: { d1: number; d2: number; value: number }
	onDeclare: () => void
}) {
	// PeekBody は peek フェーズに入るたびに（= rollId が変わるたびに）新規マウントされる
	// （declare/handover/respond/reveal を経由しないと再度 peek に来ないため）ので、
	// animating の初期値 true がそのまま「新しい投のアニメ開始」を表す
	const [animating, setAnimating] = useState(true)
	const [pressing, setPressing] = useState(false)
	const [viewed, setViewed] = useState(false)

	useEffect(() => {
		const t = setTimeout(() => setAnimating(false), ROLL_ANIM_MS)
		return () => clearTimeout(t)
	}, [rollId])

	if (animating) {
		return (
			<View style={styles.body}>
				<DiceRoll3D dice={dummyDice(rollId)} rolling rollId={rollId} />
				<Text style={styles.hint}>コロコロ…</Text>
			</View>
		)
	}

	return (
		<View style={styles.body}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="長押しで出目を確認"
				onPressIn={() => {
					haptics.tap()
					setPressing(true)
					setViewed(true)
				}}
				onPressOut={() => setPressing(false)}
				style={[styles.peekPad, pressing && styles.peekPadActive]}
			>
				{pressing ? (
					<View style={styles.peekDice}>
						<View style={styles.isoRow}>
							<IsoDie value={actual.d1 as 1 | 2 | 3 | 4 | 5 | 6} size={72} />
							<IsoDie value={actual.d2 as 1 | 2 | 3 | 4 | 5 | 6} size={72} />
						</View>
						<Text style={styles.peekValue}>{declarationLabel(actual.value)}</Text>
					</View>
				) : (
					<>
						<Text style={styles.peekEmoji}>🤫</Text>
						<Text style={styles.hint}>長押しでこっそり確認</Text>
					</>
				)}
			</Pressable>
			<GradientButton title="宣言する" onPress={onDeclare} disabled={!viewed || pressing} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: spacing.md, gap: spacing.md },
	body: { flex: 1, justifyContent: 'center', gap: spacing.lg },
	turn: { ...typography.title, textAlign: 'center' },
	hint: { ...typography.caption, textAlign: 'center' },
	bigDeclaration: { ...typography.hero, textAlign: 'center', color: DD.gold },
	peekPad: {
		minHeight: 180,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.lg,
	},
	peekPadActive: { borderColor: DD.red },
	peekEmoji: { fontSize: 40 },
	peekDice: { alignItems: 'center', gap: spacing.sm },
	isoRow: { flexDirection: 'row', gap: spacing.md },
	peekValue: { ...typography.hero },
})
