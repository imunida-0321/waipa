import AsyncStorage from '@react-native-async-storage/async-storage'

const key = (gameId: string) => `waipa.howto.${gameId}`

export async function hasSeenHowTo(gameId: string): Promise<boolean> {
	try {
		return (await AsyncStorage.getItem(key(gameId))) === '1'
	} catch {
		// 読み取り失敗は初回扱い（解説を出す方が安全側）
		return false
	}
}

export async function markHowToSeen(gameId: string): Promise<void> {
	try {
		await AsyncStorage.setItem(key(gameId), '1')
	} catch {
		// 保存失敗は無視（次回また解説が出るだけ）
	}
}
