import AsyncStorage from '@react-native-async-storage/async-storage'
import { settingsStore } from '../settings-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('settingsStore', () => {
	beforeEach(async () => {
		await AsyncStorage.clear()
		await settingsStore.hydrate()
	})

	it('初期値は両方 ON', () => {
		expect(settingsStore.getState()).toEqual({ soundEnabled: true, hapticsEnabled: true })
	})

	it('setSoundEnabled が状態と AsyncStorage を更新する', async () => {
		await settingsStore.setSoundEnabled(false)
		expect(settingsStore.getState().soundEnabled).toBe(false)
		expect(await AsyncStorage.getItem('waipa.settings')).toContain('"soundEnabled":false')
	})

	it('hydrate が保存済み設定を復元する', async () => {
		await AsyncStorage.setItem(
			'waipa.settings',
			JSON.stringify({ soundEnabled: false, hapticsEnabled: false }),
		)
		await settingsStore.hydrate()
		expect(settingsStore.getState()).toEqual({ soundEnabled: false, hapticsEnabled: false })
	})

	it('subscribe で変更通知を受け取れる', async () => {
		const listener = jest.fn()
		const unsubscribe = settingsStore.subscribe(listener)
		await settingsStore.setHapticsEnabled(false)
		expect(listener).toHaveBeenCalled()
		unsubscribe()
	})

	it('破損した保存データでも throw せずデフォルトに戻る', async () => {
		await AsyncStorage.setItem('waipa.settings', '{broken json')
		await expect(settingsStore.hydrate()).resolves.toBeUndefined()
		expect(settingsStore.getState()).toEqual({ soundEnabled: true, hapticsEnabled: true })
	})
})
