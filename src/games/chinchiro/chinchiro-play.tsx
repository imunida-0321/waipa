import { useEffect, useReducer, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ConfettiBurst } from '@/components/game/confetti-burst'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import { evaluateDice, handLabel, resolveThrows, rollSoundFor, MAX_THROWS, type Hand } from './dice'
import { Dice3D } from './dice-3d'
import { initialState, reduce, type Phase } from './reducer'
import { RulesModal } from './rules-modal'
import { CHIN } from './theme'

export const ROLL_DURATION_MS = 1200

type Props = {
	playerNames: string[]
	onFinish: (hands: Hand[]) => void
	rng?: () => number
}

// 1ラウンド全体を管理する。3D シーンは常設で、画面下の丸ボタンを押すたびに現在プレイヤーが振る。
// 役確定/3投終了で settled になり、次の人が同じ丸ボタンを押すとそのまま次の投擲が始まる。
export function ChinchiroPlay({ playerNames, onFinish, rng = Math.random }: Props) {
	const [state, dispatch] = useReducer(reduce, playerNames.length, initialState)
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const playedRollId = useRef(0)
	// 高速ダブルタップで advance/roll が二重実行されるのを防ぐ（state コミット前の再入ガード）
	const pressGuard = useRef(false)
	const { phase, playerIndex, throws, hands, displayThrow, rollId, rulesOpen } = state

	useEffect(() => {
		pressGuard.current = false
	}, [phase, playerIndex])

	const playerCount = state.playerCount
	const playerName = playerNames[playerIndex] ?? ''
	const color = playerColor(playerIndex).value
	const throwsLeft = MAX_THROWS - throws.length
	const isLastPlayer = playerIndex + 1 >= playerCount

	useEffect(() => {
		if (phase !== 'rolling' || !displayThrow) return

		if (playedRollId.current !== rollId) {
			// 出目決定は reducer 側に寄せたため、音だけ表示投の確定後に同期する。
			playSound(rollSoundFor(displayThrow))
			playedRollId.current = rollId
		}

		timer.current = setTimeout(() => {
			const hand = displayThrow.shonben ? null : evaluateDice(displayThrow.dice)
			const isLast = throws.length >= MAX_THROWS
			if (hand?.type === 'pinzoro') {
				// ピンゾロのみ即確定
				haptics.success()
				playSound('reveal')
			} else if (isLast) {
				// 3投目はションベン/役なし/役ありを問わず常にそこで確定
				if (displayThrow.shonben) {
					haptics.heavy()
					playSound('event')
				} else {
					haptics.heavy()
				}
			} else if (hand) {
				// ピンゾロ以外の役は「この役で確定」or「もう一度振る」を選ばせる
				haptics.heavy()
			} else if (displayThrow.shonben) {
				haptics.heavy()
				playSound('event')
			}
			dispatch({ type: 'rollRevealed' })
		}, ROLL_DURATION_MS)

		return () => {
			if (timer.current) clearTimeout(timer.current)
			timer.current = null
		}
	}, [displayThrow, phase, rollId, throws.length])

	useEffect(() => {
		if (phase !== 'result') return
		onFinish(hands)
	}, [hands, onFinish, phase])

	const onButtonPress = () => {
		if (pressGuard.current || phase === 'rolling' || phase === 'result') return
		pressGuard.current = true
		if (phase !== 'settled' || !isLastPlayer) haptics.tap()
		// idle（未投）/ open（残投あり）/ choice（役を確定せず振り直し）→ 振る
		dispatch({ type: 'roll', rng })
	}

	// choice で「この役で確定」を押したとき: 役は resolveThrows が最後の投から導く。
	// haptics は SecondaryButton 内蔵の tap に任せる（明示呼び出しを重ねると二重発火する）
	const onConfirmHand = () => {
		dispatch({ type: 'confirmHand' })
	}

	const finalHand = phase === 'settled' || phase === 'choice' ? resolveThrows(throws) : null
	const shonben = displayThrow?.shonben ?? false
	const orderLabel =
		`${playerIndex + 1}人目 / ${playerCount}人` +
		(throws.length > 0 ? `・${throws.length}投目` : '')

	return (
		<View style={styles.container}>
			{finalHand?.type === 'pinzoro' && <ConfettiBurst />}
			<Text style={styles.orderLabel}>{orderLabel}</Text>
			<View style={styles.nameRow}>
				<View style={[styles.colorDot, { backgroundColor: color }]} />
				<Text style={styles.name}>{playerName} さんの番</Text>
			</View>
			<Pressable
				accessibilityRole="button"
				testID="rules-button"
				style={({ pressed }) => [styles.rulesButton, pressed && styles.rulesButtonPressed]}
				onPress={() => dispatch({ type: 'openRules' })}
			>
				<Text style={styles.rulesButtonText}>🎲 役の早見表</Text>
			</Pressable>
			<RulesModal visible={rulesOpen} onClose={() => dispatch({ type: 'closeRules' })} />

			<View style={styles.stage}>
				{/* 初回投擲前もステージを見せる（待機中のサイコロを静止表示） */}
				<Dice3D
					dice={displayThrow ? displayThrow.dice : [2, 5, 3]}
					shonben={displayThrow?.shonben ?? false}
					rolling={phase === 'rolling'}
					rollId={rollId}
					durationMs={ROLL_DURATION_MS}
				/>
			</View>

			<View style={styles.statusArea}>
				{phase === 'rolling' && <Text style={styles.statusText}>コロコロコロ…</Text>}
				{phase === 'open' && (
					<Text style={[styles.statusText, shonben && { color: CHIN.handColors.hifumi }]}>
						{shonben ? 'ションベン！' : '役なし…'}
					</Text>
				)}
				{(phase === 'settled' || phase === 'choice') && finalHand && (
					<DrumrollReveal phase="revealed">
						<Text
							style={[styles.handLabel, { color: CHIN.handColors[finalHand.type] }]}
						>
							{handLabel(finalHand)}
						</Text>
					</DrumrollReveal>
				)}
			</View>

			<View style={styles.bottom}>
				{phase === 'choice' && (
					<View style={styles.confirmButton}>
						<SecondaryButton title="この役で確定" onPress={onConfirmHand} />
					</View>
				)}
				<Pressable
					testID="roll-button"
					accessibilityRole="button"
					disabled={phase === 'rolling'}
					onPress={onButtonPress}
					style={({ pressed }) => [
						styles.rollButton,
						pressed && styles.rollButtonPressed,
						phase === 'rolling' && styles.rollButtonDisabled,
					]}
				/>
				<Text style={styles.hint}>
					{hintText(
						phase,
						shonben,
						throwsLeft,
						isLastPlayer,
						playerNames[playerIndex + 1],
					)}
				</Text>
			</View>
		</View>
	)
}

// 丸ボタン下の小さなヒント文言
function hintText(
	phase: Phase,
	shonben: boolean,
	throwsLeft: number,
	isLastPlayer: boolean,
	nextName: string | undefined,
): string {
	switch (phase) {
		case 'idle':
			return 'ボタンを押して振ろう！'
		case 'rolling':
			return '　'
		case 'open':
			return `${shonben ? '丼から飛び出た！ ' : ''}のこり${throwsLeft}投！`
		case 'choice':
			return `もう一度振る？（のこり${throwsLeft}投）`
		case 'settled':
			return isLastPlayer ? '結果発表へ' : `つぎ: ${nextName ?? ''} さん ▶ ボタンで振る`
		case 'result':
			return '　'
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: CHIN.bg,
		padding: spacing.lg,
		alignItems: 'center',
	},
	orderLabel: {
		...typography.caption,
		marginBottom: spacing.sm,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	colorDot: {
		width: 14,
		height: 14,
		borderRadius: radii.pill,
	},
	name: {
		...typography.title,
	},
	rulesButton: {
		borderWidth: 1,
		borderColor: colors.surfaceBorder,
		borderRadius: radii.pill,
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.md,
	},
	rulesButtonPressed: {
		backgroundColor: colors.surface,
	},
	rulesButtonText: {
		...typography.caption,
		color: colors.text,
	},
	stage: {
		flex: 1,
		alignSelf: 'stretch',
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusArea: {
		minHeight: 72,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusText: {
		...typography.title,
	},
	handLabel: {
		...typography.hero,
		fontSize: 44,
	},
	bottom: {
		alignItems: 'center',
		marginTop: spacing.md,
	},
	confirmButton: {
		marginBottom: spacing.md,
		minWidth: 200,
	},
	rollButton: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: CHIN.rollButton,
		borderWidth: 2,
		borderColor: CHIN.rollButtonBorder,
	},
	rollButtonPressed: {
		backgroundColor: CHIN.rollButtonPressed,
	},
	rollButtonDisabled: {
		opacity: 0.4,
	},
	hint: {
		...typography.body,
		color: colors.textMuted,
		marginTop: spacing.sm,
	},
})
