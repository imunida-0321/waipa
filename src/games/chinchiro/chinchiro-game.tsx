import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { getDisplayNames, usePlayers } from '@/lib/players-store'
import type { Hand } from './dice'
import { ChinchiroPlay } from './chinchiro-play'
import { ChinchiroResult } from './result'
import { CHIN } from './theme'

// 状態機械: プレイヤーごとのロールループ → 全員終了でランキング発表（＋サドンデス）
export function ChinchiroGame() {
	const players = usePlayers()
	const names = getDisplayNames(players)
	const [hands, setHands] = useState<Hand[]>([])
	const [round, setRound] = useState(0)

	const finished = hands.length >= players.count

	return (
		<View style={styles.container}>
			{finished ? (
				<ChinchiroResult
					hands={hands}
					playerNames={names}
					onRetry={() => {
						setHands([])
						setRound((r) => r + 1)
					}}
					onHome={() => router.replace('/')}
				/>
			) : (
				<ChinchiroPlay key={round} playerNames={names} onFinish={(h) => setHands(h)} />
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: CHIN.bg,
	},
})
