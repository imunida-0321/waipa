import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { games, type GameMeta } from '@/games/registry'
import { haptics } from '@/lib/haptics'
import { usePremium } from '@/lib/premium'
import { GameCard } from './game-card'
import { PremiumLockModal } from './premium-lock-modal'

// レジストリ駆動の千鳥（ずらし）2列グリッド（Issue #44）。偶数 index → 左列、奇数 index → 右列で、
// 右列を半タイル分（列幅 48% ÷ 比率 1.3 ÷ 2 ≒ 18.5% 親幅）下げてリズムを付ける。
// ゲーム追加はレジストリに足すだけで反映される。
// プレミアム限定ゲームは未解放の間タップでロックモーダルを出す（解放判定は @/lib/premium に集約）
export function GameGrid() {
	const [lockedGame, setLockedGame] = useState<GameMeta | null>(null)
	const premiumUnlocked = usePremium()

	const handlePress = (game: GameMeta) => {
		haptics.tap()
		if (game.premium === true && !premiumUnlocked) {
			setLockedGame(game)
			return
		}
		router.push({ pathname: '/game/[id]', params: { id: game.id } })
	}

	const leftGames = games.filter((_, i) => i % 2 === 0)
	const rightGames = games.filter((_, i) => i % 2 === 1)

	return (
		<View style={styles.grid}>
			<View testID="grid-left-column" style={styles.column}>
				{leftGames.map((game) => (
					<GameCard key={game.id} game={game} onPress={() => handlePress(game)} />
				))}
			</View>
			<View testID="grid-right-column" style={[styles.column, styles.rightColumn]}>
				{rightGames.map((game) => (
					<GameCard key={game.id} game={game} onPress={() => handlePress(game)} />
				))}
			</View>
			<PremiumLockModal
				visible={lockedGame !== null}
				gameId={lockedGame?.id ?? ''}
				gameTitle={lockedGame ? `${lockedGame.emoji} ${lockedGame.title}` : ''}
				onClose={() => setLockedGame(null)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', justifyContent: 'space-between' },
	column: { width: '48%' },
	// 千鳥オフセット: 列幅 48% ÷ アスペクト比 1.3 ÷ 2 ≒ 18.46%（RN の % padding は親幅基準）
	rightColumn: { paddingTop: '18.5%' },
})
