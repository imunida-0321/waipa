import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ConfettiBurst } from '@/components/game/confetti-burst'
import { DrumrollReveal } from '@/components/game/drumroll-reveal'
import { GradientButton } from '@/components/ui/gradient-button'
import { haptics } from '@/lib/haptics'
import { playSound } from '@/lib/sound'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import {
	evaluateDice,
	handLabel,
	resolveThrows,
	rollThrow,
	MAX_THROWS,
	type Hand,
	type Throw,
} from './dice'
import { Dice3D } from './dice-3d'
import { CHIN } from './theme'

export const ROLL_DURATION_MS = 1200

type Props = {
	playerIndex: number
	playerName: string
	orderLabel: string
	doneLabel: string
	onDone: (hand: Hand) => void
	rng?: () => number
}

type Phase = 'standby' | 'rolling' | 'open' | 'record'

// 1人分のロール: スタンバイ → 転がり(1.2秒) → 出目オープン（確定/振り直し/ションベン）→ 記録ドン
export function DiceRoll({
	playerIndex,
	playerName,
	orderLabel,
	doneLabel,
	onDone,
	rng = Math.random,
}: Props) {
	const [phase, setPhase] = useState<Phase>('standby')
	const [throws, setThrows] = useState<Throw[]>([])
	const [pending, setPending] = useState<Throw | null>(null)
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	const color = playerColor(playerIndex).value
	const lastThrow = throws[throws.length - 1]
	const throwsLeft = MAX_THROWS - throws.length

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current)
		},
		[],
	)

	const roll = () => {
		playSound('tap')
		const t = rollThrow(rng)
		setPending(t)
		setPhase('rolling')
		timer.current = setTimeout(() => {
			setThrows((prev) => [...prev, t])
			const hand = t.shonben ? null : evaluateDice(t.dice)
			const isLast = throws.length + 1 >= MAX_THROWS
			if (hand || isLast) {
				// 確定 or 3投終了 → record
				if (hand?.type === 'pinzoro') {
					haptics.success()
					playSound('reveal')
				} else if (t.shonben) {
					haptics.heavy()
					playSound('event')
				} else {
					haptics.heavy()
				}
				setPhase('record')
			} else {
				if (t.shonben) {
					haptics.heavy()
					playSound('event')
				}
				setPhase('open')
			}
		}, ROLL_DURATION_MS)
	}

	if (phase === 'standby') {
		return (
			<View style={styles.container}>
				<Text style={styles.orderLabel}>{orderLabel}</Text>
				<View style={styles.nameRow}>
					<View style={[styles.colorDot, { backgroundColor: color }]} />
					<Text style={styles.name}>{playerName} さんの番</Text>
				</View>
				<Text style={styles.hint}>サイコロ3つを丼に振って役を出そう！</Text>
				<View style={styles.actions}>
					<GradientButton title="タップで振る！" onPress={roll} />
				</View>
			</View>
		)
	}

	if (phase === 'rolling') {
		return (
			<View style={styles.container}>
				<Text style={styles.orderLabel}>
					{orderLabel}・{throws.length + 1}投目
				</Text>
				<Text style={styles.nameCaption}>{playerName} さんの番</Text>
				{pending && (
					<Dice3D
						dice={pending.dice}
						shonben={pending.shonben}
						rolling
						rollId={throws.length + 1}
						durationMs={ROLL_DURATION_MS}
					/>
				)}
				<Text style={styles.hint}>コロコロコロ…</Text>
			</View>
		)
	}

	if (phase === 'open') {
		// 役なし or ションベン（残投あり）
		const shonben = lastThrow?.shonben ?? false
		return (
			<View style={styles.container}>
				<Text style={styles.orderLabel}>
					{orderLabel}・{throws.length}投目
				</Text>
				<Text style={styles.nameCaption}>{playerName} さんの番</Text>
				{lastThrow && (
					<Dice3D
						dice={lastThrow.dice}
						shonben={shonben}
						rolling={false}
						rollId={throws.length}
						durationMs={ROLL_DURATION_MS}
					/>
				)}
				<Text style={[styles.openLabel, shonben && { color: CHIN.handColors.hifumi }]}>
					{shonben ? 'ションベン！' : '役なし…'}
				</Text>
				<Text style={styles.hint}>
					{shonben ? '丼から飛び出た！' : ''}のこり{throwsLeft}投！
				</Text>
				<View style={styles.actions}>
					<GradientButton title="もう一度振る" onPress={roll} />
				</View>
			</View>
		)
	}

	// record: 最終役の確定表示（確定役はその投の出目、ションベンは飛び出し表現）
	const finalHand = resolveThrows(throws)
	const handColor = CHIN.handColors[finalHand.type]

	return (
		<View style={styles.container}>
			{finalHand.type === 'pinzoro' && <ConfettiBurst />}
			<Text style={styles.orderLabel}>{playerName} さんの記録</Text>
			{lastThrow && (
				<Dice3D
					dice={lastThrow.dice}
					shonben={lastThrow.shonben}
					rolling={false}
					rollId={throws.length}
					durationMs={ROLL_DURATION_MS}
				/>
			)}
			<DrumrollReveal phase="revealed">
				<Text style={[styles.handLabel, { color: handColor }]}>{handLabel(finalHand)}</Text>
			</DrumrollReveal>
			<View style={styles.actions}>
				<GradientButton title={doneLabel} onPress={() => onDone(finalHand)} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: CHIN.bg,
		padding: spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
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
	nameCaption: {
		...typography.body,
		marginBottom: spacing.md,
	},
	hint: {
		...typography.body,
		color: colors.textMuted,
		marginTop: spacing.md,
	},
	openLabel: {
		...typography.title,
		marginTop: spacing.sm,
	},
	handLabel: {
		...typography.hero,
		fontSize: 44,
	},
	actions: {
		alignSelf: 'stretch',
		marginTop: spacing.xl,
	},
})
