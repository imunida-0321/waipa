import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { games, type GameMeta } from '@/games/registry'
import { haptics } from '@/lib/haptics'
import { usePremium } from '@/lib/premium'
import { GameCard } from './game-card'
import { PremiumLockModal } from './premium-lock-modal'

// レジストリ駆動の2列グリッド。ゲーム追加はレジストリに足すだけで反映される。
// プレミアム限定ゲームは未解放の間タップでロックモーダルを出す（解放判定は @/lib/premium に集約）
export function GameGrid() {
	const [lockedGame, setLockedGame] = useState<GameMeta | null>(null)
	const premiumUnlocked = usePremium()

	return (
		<View style={styles.grid}>
			{games.map((game) => (
				<GameCard
					key={game.id}
					game={game}
					onPress={() => {
						haptics.tap()
						if (game.premium === true && !premiumUnlocked) {
							setLockedGame(game)
							return
						}
						router.push({ pathname: '/game/[id]', params: { id: game.id } })
					}}
				/>
			))}
			<PremiumLockModal
				visible={lockedGame !== null}
				gameTitle={lockedGame ? `${lockedGame.emoji} ${lockedGame.title}` : ''}
				onClose={() => setLockedGame(null)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
})
