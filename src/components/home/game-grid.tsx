import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { games } from '@/games/registry'
import { haptics } from '@/lib/haptics'
import { GameCard } from './game-card'

// レジストリ駆動の2列グリッド。ゲーム追加はレジストリに足すだけで反映される
export function GameGrid() {
	return (
		<View style={styles.grid}>
			{games.map((game) => (
				<GameCard
					key={game.id}
					game={game}
					onPress={() => {
						haptics.tap()
						router.push({ pathname: '/game/[id]', params: { id: game.id } })
					}}
				/>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
})
