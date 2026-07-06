import { Redirect, useLocalSearchParams } from 'expo-router'
import { GameScreen } from '@/components/game/game-screen'
import { getGame } from '@/games/registry'

export default function GameRoute() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const meta = getGame(id ?? '')
	if (!meta) return <Redirect href="/" />
	return <GameScreen meta={meta} />
}
