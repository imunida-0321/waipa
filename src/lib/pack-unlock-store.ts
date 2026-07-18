import { useSyncExternalStore } from 'react'
import { isPremiumUnlocked } from './premium'

// リワード視聴によるお題パックのセッション解放（メモリのみ・ゲーム退出で lock）。
// 永続化しないのは仕様: 「その飲み会のあいだ」だけ解放し、繰り返し視聴を促す（issue #6）
let unlockedPacks: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function emit() {
	listeners.forEach((fn) => fn())
}

export const packUnlockStore = {
	subscribe(fn: () => void): () => void {
		listeners.add(fn)
		return () => listeners.delete(fn)
	},
	unlock(pack: string) {
		unlockedPacks = new Set(unlockedPacks).add(pack)
		emit()
	},
	lock(pack: string) {
		const next = new Set(unlockedPacks)
		next.delete(pack)
		unlockedPacks = next
		emit()
	},
	_resetForTest() {
		unlockedPacks = new Set()
	},
}

export function isPackUnlocked(pack: string): boolean {
	return isPremiumUnlocked() || unlockedPacks.has(pack)
}

export function usePackUnlocked(pack: string): boolean {
	return useSyncExternalStore(
		packUnlockStore.subscribe,
		() => isPackUnlocked(pack),
		() => isPackUnlocked(pack),
	)
}
