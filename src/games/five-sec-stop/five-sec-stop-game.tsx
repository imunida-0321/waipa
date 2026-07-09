import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import { FiveSecResult } from './result'
import { StopwatchPlay } from './stopwatch-play'
import { FSS } from './theme'

// 状態機械: プレイヤーごとの計測ループ → 全員終了でランキング発表
export function FiveSecStopGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [records, setRecords] = useState<number[]>([])
	const [round, setRound] = useState(0)

	const current = records.length
	const finished = current >= players.count

	return (
		<View style={styles.container}>
			{finished ? (
				<FiveSecResult
					records={records}
					playerNames={names}
					onRetry={() => {
						setRecords([])
						setRound((r) => r + 1)
					}}
					onHome={() => router.replace('/')}
				/>
			) : (
				<StopwatchPlay
					key={`${round}-${current}`}
					playerIndex={current}
					playerName={names[current]}
					orderLabel={`${current + 1}人目 / ${players.count}人`}
					doneLabel={current === players.count - 1 ? '結果発表へ' : 'つぎの人へ'}
					onDone={(ms) => setRecords((prev) => [...prev, ms])}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: FSS.bg,
	},
})
