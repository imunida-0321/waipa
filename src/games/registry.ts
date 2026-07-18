import type { GameMeta } from './types'
import { meta as bomb216Meta } from './bomb-216/meta'
import { meta as bombRelayMeta } from './bomb-relay/meta'
import { meta as bombSwipeMeta } from './bomb-swipe/meta'
import { meta as burstChickenMeta } from './burst-chicken/meta'
import { meta as chinchiroMeta } from './chinchiro/meta'
import { meta as dautDiceMeta } from './daut-dice/meta'
import { meta as fiveSecStopMeta } from './five-sec-stop/meta'
import { meta as inshuSuijakuMeta } from './inshu-suijaku/meta'
import { meta as kanpaiWolfMeta } from './kanpai-wolf/meta'
import { meta as kimagureOxMeta } from './kimagure-ox/meta'
import { meta as noKingGameMeta } from './no-king-game/meta'
import { meta as odekoPokerMeta } from './odeko-poker/meta'
import { meta as reactionPairsMeta } from './reaction-pairs/meta'
import { meta as sasayakiLimitMeta } from './sasayaki-limit/meta'
import { meta as whoWillPayMeta } from './who-will-pay/meta'

export type { GameMeta } from './types'

// ホーム画面の表示順。追加時は該当ゲームの meta.ts を作って並べる
export const games: readonly GameMeta[] = [
	whoWillPayMeta,
	bomb216Meta,
	fiveSecStopMeta,
	kimagureOxMeta,
	noKingGameMeta,
	chinchiroMeta,
	bombRelayMeta,
	reactionPairsMeta,
	burstChickenMeta,
	dautDiceMeta,
	kanpaiWolfMeta,
	inshuSuijakuMeta,
	bombSwipeMeta,
	sasayakiLimitMeta,
	odekoPokerMeta,
]

export function getGame(id: string): GameMeta | undefined {
	return games.find((g) => g.id === id)
}
