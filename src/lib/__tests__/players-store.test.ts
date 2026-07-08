import AsyncStorage from '@react-native-async-storage/async-storage'
import { allNamesFilled, getDisplayNames, playersStore } from '../players-store'

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

	it('破損した保存データでも throw せずデフォルトに戻る', async () => {
		await AsyncStorage.setItem('waipa.players', '{broken json')
		await expect(playersStore.hydrate()).resolves.toBeUndefined()
		expect(playersStore.getState()).toEqual({ count: 4, names: [], history: [] })
	})

	it('AsyncStorage.getItem の失敗でも throw せずデフォルトに戻る', async () => {
		await playersStore.setCount(6)
		const spy = jest
			.spyOn(AsyncStorage, 'getItem')
			.mockRejectedValueOnce(new Error('read error'))
		await expect(playersStore.hydrate()).resolves.toBeUndefined()
		expect(playersStore.getState()).toEqual({ count: 4, names: [], history: [] })
		spy.mockRestore()
	})
})

describe('addPlayer / removePlayer / history', () => {
	beforeEach(async () => {
		await AsyncStorage.clear()
		await playersStore.hydrate()
	})

	it('addPlayer で1人増え、removePlayer で対象の名前ごと消える', async () => {
		await playersStore.setCount(3)
		await playersStore.setName(0, 'A')
		await playersStore.setName(1, 'B')
		await playersStore.setName(2, 'C')
		await playersStore.addPlayer()
		expect(playersStore.getState().count).toBe(4)
		await playersStore.removePlayer(1)
		const s = playersStore.getState()
		expect(s.count).toBe(3)
		expect(s.names.slice(0, 2)).toEqual(['A', 'C'])
	})

	it('saveToHistory は空でないセットを先頭に最大5件保存する', async () => {
		await playersStore.setCount(2)
		await playersStore.setName(0, 'ひろ')
		await playersStore.saveToHistory()
		expect(playersStore.getState().history[0]).toEqual(['ひろ', ''])
	})

	it('全員未入力なら saveToHistory は何もしない', async () => {
		await playersStore.saveToHistory()
		expect(playersStore.getState().history).toHaveLength(0)
	})

	it('applyHistory が人数と名前を復元する', async () => {
		await playersStore.setCount(2)
		await playersStore.setName(0, 'ひろ')
		await playersStore.saveToHistory()
		await playersStore.setCount(6)
		await playersStore.applyHistory(0)
		expect(playersStore.getState().count).toBe(2)
		expect(playersStore.getState().names[0]).toBe('ひろ')
	})
})

describe('allNamesFilled', () => {
	it('全員名前が入力されていれば true', () => {
		const s = { count: 2, names: ['ひろ', 'たろう'], history: [] }
		expect(allNamesFilled(s)).toBe(true)
	})

	it('誰か1人でも未入力なら false', () => {
		const s = { count: 3, names: ['ひろ', '', 'たろう'], history: [] }
		expect(allNamesFilled(s)).toBe(false)
	})

	it('空白のみの名前は未入力扱いで false', () => {
		const s = { count: 2, names: ['ひろ', '   '], history: [] }
		expect(allNamesFilled(s)).toBe(false)
	})

	it('names 配列が count より短い場合も false', () => {
		const s = { count: 2, names: ['ひろ'], history: [] }
		expect(allNamesFilled(s)).toBe(false)
	})
})
