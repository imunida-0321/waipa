import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { playerColor } from '@/theme/player-colors'
import { AmountEntry } from './amount-entry'
import type { DigitSlot } from './payment'
import { Result } from './result'
import { RoulettePlay } from './roulette-play'
import { WWP } from './theme'

const MAX_GAME_PLAYERS = 8

type Phase = 'amount' | 'roulette' | 'result'

// 状態機械: 金額入力 → ルーレット → リザルト
export function WhoWillPayGame() {
	const players = usePlayers()
	const [phase, setPhase] = useState<Phase>('amount')
	const [amount, setAmount] = useState(0)
	const [slots, setSlots] = useState<DigitSlot[]>([])

	const clampedCount = Math.min(players.count, MAX_GAME_PLAYERS)
	const playerNames = getDisplayNames(players).slice(0, MAX_GAME_PLAYERS)
	const playerColors = Array.from({ length: clampedCount }, (_, i) => playerColor(i).value)

	return (
		<View style={styles.container}>
			{phase === 'amount' && (
				<AmountEntry
					onConfirm={(a) => {
						setAmount(a)
						setPhase('roulette')
					}}
				/>
			)}
			{phase === 'roulette' && (
				<RoulettePlay
					amount={amount}
					playerColors={playerColors}
					playerNames={playerNames}
					onFinish={(s) => {
						setSlots(s)
						setPhase('result')
					}}
				/>
			)}
			{phase === 'result' && (
				<Result
					slots={slots}
					playerNames={playerNames}
					onRetry={() => setPhase('amount')}
					onHome={() => router.replace('/')}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: WWP.bg,
	},
})
