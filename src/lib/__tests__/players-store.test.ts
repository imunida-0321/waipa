import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDisplayNames, playersStore } from '../players-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('playersStore', () => {
	beforeEach(async () => {
		await AsyncStorage.clear()
		await playersStore.hydrate()
	})

	it('初期値は4人・名前なし', () => {
		expect(playersStore.getState().count).toBe(4)
	})

	it('setCount は 2〜12 にクランプされる', async () => {
		await playersStore.setCount(1)
		expect(playersStore.getState().count).toBe(2)
		await playersStore.setCount(99)
		expect(playersStore.getState().count).toBe(12)
	})

	it('setName で名前を設定でき、AsyncStorage に永続化される', async () => {
		await playersStore.setName(0, 'ひろかず')
		expect(playersStore.getState().names[0]).toBe('ひろかず')
		expect(await AsyncStorage.getItem('waipa.players')).toContain('ひろかず')
	})

	it('getDisplayNames は未入力を「N番」で埋める', async () => {
		await playersStore.setCount(3)
		await playersStore.setName(1, 'たろう')
		expect(getDisplayNames(playersStore.getState())).toEqual(['1番', 'たろう', '3番'])
	})

	it('hydrate が保存済み状態を復元する', async () => {
		await AsyncStorage.setItem('waipa.players', JSON.stringify({ count: 6, names: ['A'] }))
		await playersStore.hydrate()
		expect(playersStore.getState().count).toBe(6)
		expect(playersStore.getState().names[0]).toBe('A')
	})
})
