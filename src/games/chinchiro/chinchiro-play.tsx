import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ConfettiBurst } from '@/components/game/confetti-burst'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import {
	evaluateDice,
	handLabel,
	resolveThrows,
	rollSoundFor,
	rollThrow,
	MAX_THROWS,
	type Hand,
	type Throw,
} from './dice'
import { Dice3D } from './dice-3d'
import { RulesModal } from './rules-modal'
import { CHIN } from './theme'

export const ROLL_DURATION_MS = 1200

type Props = {
	playerNames: string[]
	onFinish: (hands: Hand[]) => void
	rng?: () => number
}

type Status = 'idle' | 'rolling' | 'open' | 'choice' | 'settled'

// 1ラウンド全体を管理する。3D シーンは常設で、画面下の丸ボタンを押すたびに現在プレイヤーが振る。
// 役確定/3投終了で settled になり、次の人が同じ丸ボタンを押すとそのまま次の投擲が始まる。
export function ChinchiroPlay({ playerNames, onFinish, rng = Math.random }: Props) {
	const [playerIndex, setPlayerIndex] = useState(0)
	const [throws, setThrows] = useState<Throw[]>([])
	const [hands, setHands] = useState<Hand[]>([])
	const [status, setStatus] = useState<Status>('idle')
	// Dice3D に渡す現在の表示投。null の間は 3D 未表示（初回投擲でマウントし以降は保持）
	const [displayThrow, setDisplayThrow] = useState<Throw | null>(null)
	// ラウンド通算の投数カウンタ。投ごとに +1 して Dice3D のアニメをリスタートさせる
	const [rollId, setRollId] = useState(0)
	const [rulesOpen, setRulesOpen] = useState(false)
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
	// 高速ダブルタップで advance/roll が二重実行されるのを防ぐ（state コミット前の再入ガード）
	const pressGuard = useRef(false)

	useEffect(() => {
		pressGuard.current = false
	}, [status, playerIndex])

	const playerCount = playerNames.length
	const playerName = playerNames[playerIndex] ?? ''
	const color = playerColor(playerIndex).value
	const throwsLeft = MAX_THROWS - throws.length
	const isLastPlayer = playerIndex + 1 >= playerCount

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current)
		},
		[],
	)

	// 1投ぶんの実行: rollThrow → 転がり(1.2秒) → 役判定で open/settled へ。
	// prevThrows は現在プレイヤーの既存投列（次プレイヤーへ進む際は空配列を渡す）。
	const roll = (prevThrows: Throw[]) => {
		haptics.tap()
		const t = rollThrow(rng)
		// 転がり音は2種をランダム再生。出目合計の偶奇で選ぶ（50/50。rng を余分に消費しない）
		playSound(rollSoundFor(t))
		const nextThrows = [...prevThrows, t]
		setDisplayThrow(t)
		setThrows(nextThrows)
		setRollId((id) => id + 1)
		setStatus('rolling')
		timer.current = setTimeout(() => {
			const hand = t.shonben ? null : evaluateDice(t.dice)
			const isLast = nextThrows.length >= MAX_THROWS
			if (hand?.type === 'pinzoro') {
				// ピンゾロのみ即確定
				haptics.success()
				playSound('reveal')
				setStatus('settled')
			} else if (isLast) {
				// 3投目はションベン/役なし/役ありを問わず常にそこで確定
				if (t.shonben) {
					haptics.heavy()
					playSound('event')
				} else {
					haptics.heavy()
				}
				setStatus('settled')
			} else if (hand) {
				// ピンゾロ以外の役は「この役で確定」or「もう一度振る」を選ばせる
				haptics.heavy()
				setStatus('choice')
			} else {
				if (t.shonben) {
					haptics.heavy()
					playSound('event')
				}
				setStatus('open')
			}
		}, ROLL_DURATION_MS)
	}

	// settled で丼ボタンを押したとき: 確定役を積んで次プレイヤーへ。最後なら全員分で onFinish。
	const advance = () => {
		const finalHand = resolveThrows(throws)
		const nextHands = [...hands, finalHand]
		if (isLastPlayer) {
			onFinish(nextHands)
			return
		}
		setHands(nextHands)
		setPlayerIndex(playerIndex + 1)
		setThrows([])
		roll([])
	}

	const onButtonPress = () => {
		if (pressGuard.current || status === 'rolling') return
		pressGuard.current = true
		if (status === 'settled') {
			advance()
			return
		}
		// idle（未投）/ open（残投あり）/ choice（役を確定せず振り直し）→ 振る
		roll(throws)
	}

	// choice で「この役で確定」を押したとき: 役は resolveThrows が最後の投から導く。
	// haptics は SecondaryButton 内蔵の tap に任せる（明示呼び出しを重ねると二重発火する）
	const onConfirmHand = () => {
		setStatus('settled')
	}

	const finalHand = status === 'settled' || status === 'choice' ? resolveThrows(throws) : null
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
				onPress={() => setRulesOpen(true)}
			>
				<Text style={styles.rulesButtonText}>🎲 役の早見表</Text>
			</Pressable>
			<RulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />

			<View style={styles.stage}>
				{/* 初回投擲前もステージを見せる（待機中のサイコロを静止表示） */}
				<Dice3D
					dice={displayThrow ? displayThrow.dice : [2, 5, 3]}
					shonben={displayThrow?.shonben ?? false}
					rolling={status === 'rolling'}
					rollId={rollId}
					durationMs={ROLL_DURATION_MS}
				/>
			</View>

			<View style={styles.statusArea}>
				{status === 'rolling' && <Text style={styles.statusText}>コロコロコロ…</Text>}
				{status === 'open' && (
					<Text style={[styles.statusText, shonben && { color: CHIN.handColors.hifumi }]}>
						{shonben ? 'ションベン！' : '役なし…'}
					</Text>
				)}
				{(status === 'settled' || status === 'choice') && finalHand && (
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
				{status === 'choice' && (
					<View style={styles.confirmButton}>
						<SecondaryButton title="この役で確定" onPress={onConfirmHand} />
					</View>
				)}
				<Pressable
					testID="roll-button"
					accessibilityRole="button"
					disabled={status === 'rolling'}
					onPress={onButtonPress}
					style={({ pressed }) => [
						styles.rollButton,
						pressed && styles.rollButtonPressed,
						status === 'rolling' && styles.rollButtonDisabled,
					]}
				/>
				<Text style={styles.hint}>
					{hintText(
						status,
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
	status: Status,
	shonben: boolean,
	throwsLeft: number,
	isLastPlayer: boolean,
	nextName: string | undefined,
): string {
	switch (status) {
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
		backgroundColor: '#D8D8DC',
		borderWidth: 2,
		borderColor: '#F2F2F5',
	},
	rollButtonPressed: {
		backgroundColor: '#A9A9AE',
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
