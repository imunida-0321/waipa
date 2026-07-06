import AsyncStorage from '@react-native-async-storage/async-storage'

const key = (gameId: string) => `waipa.howto.${gameId}`

export async function hasSeenHowTo(gameId: string): Promise<boolean> {
	return (await AsyncStorage.getItem(key(gameId))) === '1'
}

export async function markHowToSeen(gameId: string): Promise<void> {
	await AsyncStorage.setItem(key(gameId), '1')
}
