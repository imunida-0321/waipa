import { Redirect, useLocalSearchParams } from 'expo-router'
import { GameScreen } from '@/components/game/game-screen'
import { getGame } from '@/games/registry'
import { usePremium } from '@/lib/premium'
import { isTrialActive } from '@/lib/trial-store'

export default function GameRoute() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const premiumUnlocked = usePremium()
	const meta = getGame(id ?? '')
	if (!meta) return <Redirect href="/" />
	// プレミアム限定ゲームは、購読者かそのゲームのお試し中でなければ開かせない。
	// ホームのグリッドを通らない入口（ディープリンクなど）でもロックを効かせる（issue #159）
	if (meta.premium === true && !premiumUnlocked && !isTrialActive(meta.id)) {
		return <Redirect href="/" />
	}
	return <GameScreen meta={meta} />
}
