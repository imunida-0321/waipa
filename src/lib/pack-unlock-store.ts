import { useSyncExternalStore } from 'react'
import { createStore } from './create-store'
import { isPremiumUnlocked } from './premium'

// リワード視聴によるお題パックのセッション解放（メモリのみ・ゲーム退出で lock）。
// 永続化しないのは仕様: 「その飲み会のあいだ」だけ解放し、繰り返し視聴を促す（issue #6）
const store = createStore<ReadonlySet<string>>(new Set())

export const packUnlockStore = {
	subscribe: store.subscribe,
	unlock(pack: string) {
		store.setState((unlockedPacks) => new Set(unlockedPacks).add(pack))
	},
	lock(pack: string) {
		const next = new Set(store.getState())
		next.delete(pack)
		store.setState(next)
	},
	_resetForTest() {
		store.setState(new Set())
	},
}

export function isPackUnlocked(pack: string): boolean {
	return isPremiumUnlocked() || store.getState().has(pack)
}

export function usePackUnlocked(pack: string): boolean {
	return useSyncExternalStore(
		packUnlockStore.subscribe,
		() => isPackUnlocked(pack),
		() => isPackUnlocked(pack),
	)
}
