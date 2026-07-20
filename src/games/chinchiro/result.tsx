import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useDrumroll } from '@/components/game/use-drumroll'
import { GlassSurface } from '@/components/ui/glass-surface'
import { GradientButton } from '@/components/ui/gradient-button'
import { SecondaryButton } from '@/components/ui/secondary-button'
import { playSound } from '@/lib/sound'
import { haptics } from '@/lib/haptics'
import { playerColor } from '@/theme/player-colors'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import {
	evaluateDice,
	handLabel,
	NOME,
	rankPlayers,
	rollSoundFor,
	rollThrow,
	type Hand,
	type Ranked,
} from './dice'
import { IsoDie } from './iso-die'
import { CHIN } from './theme'

export const REVEAL_INTERVAL_MS = 600
const SUDDEN_ROLL_MS = 1200

type Props = {
	hands: Hand[]
	playerNames: string[]
	onRetry: () => void
	onHome: () => void
	rng?: () => number
}

type Stage = 'ranking' | 'sudden-death' | 'final'

// ランキング発表（順めくり→最下位ドラムロール）→ 同率複数ならサドンデス → 敗者確定
export function ChinchiroResult({ hands, playerNames, onRetry, onHome, rng = Math.random }: Props) {
	const ranked = rankPlayers(hands)
	const initialLosers = ranked.filter((r) => r.isLoser).map((r) => r.playerIndex)
	const safeCount = ranked.length - initialLosers.length

	const [revealed, setRevealed] = useState(0)
	// サドンデス決着後の敗者（サドンデスが起きなければ null のまま）。
	// setState はイベントハンドラ（SuddenDeath の onSettled）からのみ呼ばれるので、
	// react-hooks/set-state-in-effect には抵触しない。
	const [suddenDeathLosers, setSuddenDeathLosers] = useState<number[] | null>(null)
	const drum = useDrumroll()
	const drumStarted = useRef(false)

	// 順めくり: interval コールバック内で drumroll 開始まで直接進める（fake timers 対応の定石）
	useEffect(() => {
		const { start } = drum
		let count = 0
		const id = setInterval(() => {
			count += 1
			if (count >= safeCount) {
				clearInterval(id)
				if (!drumStarted.current) {
					drumStarted.current = true
					start()
				}
			}
			setRevealed(count)
		}, REVEAL_INTERVAL_MS)
		if (safeCount === 0) {
			clearInterval(id)
			if (!drumStarted.current) {
				drumStarted.current = true
				start()
			}
		}
		return () => clearInterval(id)
		// マウント時1回だけ実行（drum.start は useCallback で安定）
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const losersRevealed = drum.phase === 'revealed'
	const singleLoserCase = initialLosers.length <= 1

	// ドラムロール明け後: 単独敗者ならその場で確定、複数なら結着(suddenDeathLosers)待ちでサドンデスへ。
	// effect で setState する代わりに render 中に導出する。
	const stage: Stage = !losersRevealed
		? 'ranking'
		: singleLoserCase || suddenDeathLosers
			? 'final'
			: 'sudden-death'
	const finalLosers: number[] = singleLoserCase ? initialLosers : (suddenDeathLosers ?? [])

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>結果発表</Text>

			{ranked.map((entry, rankIndex) => (
				<RankCard
					key={entry.playerIndex}
					entry={entry}
					rank={rankIndex + 1}
					name={playerNames[entry.playerIndex]}
					shown={entry.isLoser ? losersRevealed : rankIndex < revealed}
					isFinalLoser={stage === 'final' && finalLosers.includes(entry.playerIndex)}
				/>
			))}

			{stage === 'sudden-death' && (
				<SuddenDeath
					contenders={initialLosers}
					playerNames={playerNames}
					rng={rng}
					onSettled={(losers) => {
						setSuddenDeathLosers(losers)
						haptics.heavy()
						playSound('reveal')
					}}
				/>
			)}

			{stage === 'final' && (
				<>
					{/* 名前は各 RankCard の「敗者！」バッジで既に表示済みのため、ここでは repeat しない
					   （同じ名前を持つ Text ノードが複数出来ると a11y クエリが曖昧になるのを避ける） */}
					<Text style={styles.loserBanner}>＼ 罰ゲーム決定！ ／</Text>
					<View style={styles.actions}>
						<GradientButton title="もう一回" onPress={onRetry} />
						<View style={styles.actionGap} />
						<SecondaryButton title="ホームへ" onPress={onHome} />
					</View>
				</>
			)}
		</ScrollView>
	)
}

// サドンデス: 当事者が順に1投（役なし/ションベン=目なし扱い）。全員振ったら最小scoreが敗者。同率なら次ラウンド
function SuddenDeath({
	contenders,
	playerNames,
	rng,
	onSettled,
}: {
	contenders: number[]
	playerNames: string[]
	rng: () => number
	onSettled: (losers: number[]) => void
}) {
	const [round, setRound] = useState<number[]>(contenders)
	const [turn, setTurn] = useState(0)
	const [results, setResults] = useState<Hand[]>([])
	const [rolling, setRolling] = useState(false)
	const [lastResult, setLastResult] = useState<{
		name: string
		dice: [number, number, number] | null
	} | null>(null)
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current)
		},
		[],
	)

	const currentPlayer = round[turn]

	const roll = () => {
		const t = rollThrow(rng)
		playSound(rollSoundFor(t))
		setRolling(true)
		timer.current = setTimeout(() => {
			const hand = t.shonben ? NOME : (evaluateDice(t.dice) ?? NOME)
			setLastResult({ name: playerNames[currentPlayer], dice: t.shonben ? null : t.dice })
			if (t.shonben) playSound('event')
			setRolling(false)
			const nextResults = [...results, hand]
			if (turn + 1 < round.length) {
				setResults(nextResults)
				setTurn(turn + 1)
				return
			}
			// 全員振った → 判定
			const worst = Math.min(...nextResults.map((h) => h.score))
			const losers = round.filter((_, i) => nextResults[i].score === worst)
			if (losers.length === round.length) {
				// 全員同率 → 再ラウンド
				setRound(losers)
				setResults([])
				setTurn(0)
				return
			}
			if (losers.length === 1) {
				onSettled(losers)
				return
			}
			// 同率複数（一部）→ その面々で再ラウンド
			setRound(losers)
			setResults([])
			setTurn(0)
		}, SUDDEN_ROLL_MS)
	}

	return (
		<View style={styles.sudden}>
			<Text style={styles.suddenTitle}>同率最下位！サドンデス！</Text>
			{rolling ? (
				<Text style={styles.suddenRolling}>コロコロコロ…</Text>
			) : (
				<>
					{lastResult &&
						(lastResult.dice ? (
							<View style={styles.suddenDice}>
								<Text style={styles.suddenLastLabel}>{lastResult.name} さん:</Text>
								<IsoDie
									value={lastResult.dice[0] as 1 | 2 | 3 | 4 | 5 | 6}
									size={36}
									tilt={-6}
								/>
								<IsoDie
									value={lastResult.dice[1] as 1 | 2 | 3 | 4 | 5 | 6}
									size={40}
								/>
								<IsoDie
									value={lastResult.dice[2] as 1 | 2 | 3 | 4 | 5 | 6}
									size={36}
									tilt={8}
								/>
							</View>
						) : (
							<Text style={styles.suddenShonben}>
								{lastResult.name} さん: ションベン！（目なし扱い）
							</Text>
						))}
					<Text style={styles.suddenName}>{playerNames[currentPlayer]} さんの番</Text>
					<GradientButton title="タップで振る！" onPress={roll} />
				</>
			)}
		</View>
	)
}

function RankCard({
	entry,
	rank,
	name,
	shown,
	isFinalLoser,
}: {
	entry: Ranked
	rank: number
	name: string
	shown: boolean
	isFinalLoser: boolean
}) {
	if (!shown) {
		return (
			<GlassSurface style={styles.card}>
				<Text style={styles.hiddenMark}>？？？</Text>
			</GlassSurface>
		)
	}

	const handColor = CHIN.handColors[entry.hand.type]
	const isTop = rank === 1 && !entry.isLoser
	const dotColor = playerColor(entry.playerIndex).value

	return (
		<GlassSurface style={[styles.card, isTop && styles.topCard, isFinalLoser && styles.loserCard]}>
			<Text style={styles.rank}>{rank}位</Text>
			<View style={[styles.colorDot, { backgroundColor: dotColor }]} />
			<Text style={styles.name}>{name}</Text>
			{isFinalLoser && <Text style={styles.loserMark}>敗者！</Text>}
			<Text style={[styles.hand, { color: handColor }]}>{handLabel(entry.hand)}</Text>
		</GlassSurface>
	)
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: CHIN.bg,
		padding: spacing.lg,
		justifyContent: 'center',
	},
	title: {
		...typography.title,
		textAlign: 'center',
		marginBottom: spacing.lg,
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		borderRadius: radii.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		marginBottom: spacing.sm,
		minHeight: 52,
	},
	topCard: {
		borderColor: colors.gold,
	},
	loserCard: {
		borderColor: CHIN.handColors.hifumi,
	},
	hiddenMark: {
		...typography.body,
		color: colors.textMuted,
		letterSpacing: 4,
		textAlign: 'center',
		flex: 1,
	},
	rank: {
		...typography.caption,
		width: 32,
	},
	colorDot: {
		width: 12,
		height: 12,
		borderRadius: radii.pill,
	},
	name: {
		...typography.body,
		flex: 1,
	},
	loserMark: {
		...typography.body,
		color: CHIN.handColors.hifumi,
		fontWeight: '700',
	},
	hand: {
		...typography.body,
		fontWeight: '700',
	},
	sudden: {
		alignItems: 'center',
		marginTop: spacing.md,
		gap: spacing.sm,
	},
	suddenTitle: {
		...typography.title,
		color: CHIN.handColors.nome,
	},
	suddenRolling: {
		...typography.body,
		color: colors.textMuted,
	},
	suddenLastLabel: {
		...typography.caption,
		color: colors.textMuted,
	},
	suddenShonben: {
		...typography.body,
		color: CHIN.handColors.hifumi,
		fontWeight: '700',
	},
	suddenDice: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	suddenName: {
		...typography.body,
	},
	loserBanner: {
		...typography.title,
		color: CHIN.handColors.hifumi,
		textAlign: 'center',
		marginTop: spacing.md,
	},
	actions: {
		marginTop: spacing.md,
	},
	actionGap: {
		height: spacing.sm,
	},
})
