import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	countByType,
	customPunishmentsStore,
	getActivePool,
	getActiveSet,
	MAX_NORMAL_ITEMS,
	MAX_SETS,
	MAX_SPECIAL_ITEMS,
} from '../custom-punishments-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('customPunishmentsStore', () => {
	beforeEach(async () => {
		await AsyncStorage.clear()
		await customPunishmentsStore.hydrate()
	})

	it('初期値はデフォルトセット1つ・enabled・空アイテム', () => {
		const s = customPunishmentsStore.getState()
		expect(s.enabled).toBe(true)
		expect(s.sets).toHaveLength(1)
		expect(getActiveSet(s).name).toBe('マイセット')
		expect(getActiveSet(s).items).toEqual([])
	})

	it('addItem でアクティブセットに追加され、永続化される', async () => {
		await customPunishmentsStore.addItem('normal', '幹事のモノマネをして1杯')
		const set = getActiveSet(customPunishmentsStore.getState())
		expect(set.items).toEqual([{ id: 'c2', text: '幹事のモノマネをして1杯', type: 'normal' }])
		expect(await AsyncStorage.getItem('waipa.inshu-suijaku.custom-punishments')).toContain(
			'幹事のモノマネ',
		)
	})

	it('addItem は空白のみを無視し、41文字以上を40文字に切り詰める', async () => {
		await customPunishmentsStore.addItem('normal', '   ')
		expect(getActiveSet(customPunishmentsStore.getState()).items).toHaveLength(0)
		await customPunishmentsStore.addItem('normal', 'あ'.repeat(41))
		expect(getActiveSet(customPunishmentsStore.getState()).items[0].text).toBe('あ'.repeat(40))
	})

	it('addItem はタイプ別上限（通常20・特大5）で頭打ちになる', async () => {
		for (let i = 0; i < MAX_NORMAL_ITEMS + 1; i++) {
			await customPunishmentsStore.addItem('normal', `通常${i}`)
		}
		for (let i = 0; i < MAX_SPECIAL_ITEMS + 1; i++) {
			await customPunishmentsStore.addItem('special', `特大${i}`)
		}
		const set = getActiveSet(customPunishmentsStore.getState())
		expect(countByType(set, 'normal')).toBe(MAX_NORMAL_ITEMS)
		expect(countByType(set, 'special')).toBe(MAX_SPECIAL_ITEMS)
	})

	it('updateItem / removeItem がアクティブセットの該当アイテムに効く', async () => {
		await customPunishmentsStore.addItem('normal', '元のお題')
		const id = getActiveSet(customPunishmentsStore.getState()).items[0].id
		await customPunishmentsStore.updateItem(id, '直したお題')
		expect(getActiveSet(customPunishmentsStore.getState()).items[0].text).toBe('直したお題')
		await customPunishmentsStore.removeItem(id)
		expect(getActiveSet(customPunishmentsStore.getState()).items).toHaveLength(0)
	})

	it('addSet で新セットがアクティブになり、上限5個で頭打ちになる', async () => {
		await customPunishmentsStore.addSet('会社飲み用')
		const s = customPunishmentsStore.getState()
		expect(s.sets).toHaveLength(2)
		expect(getActiveSet(s).name).toBe('会社飲み用')
		for (let i = 0; i < MAX_SETS; i++) {
			await customPunishmentsStore.addSet(`extra${i}`)
		}
		expect(customPunishmentsStore.getState().sets).toHaveLength(MAX_SETS)
	})

	it('addSet は空名を「セットn」で補い、13文字以上を12文字に切り詰める', async () => {
		await customPunishmentsStore.addSet('  ')
		expect(getActiveSet(customPunishmentsStore.getState()).name).toBe('セット2')
		await customPunishmentsStore.addSet('あ'.repeat(13))
		expect(getActiveSet(customPunishmentsStore.getState()).name).toBe('あ'.repeat(12))
	})

	it('removeSet は最後の1セットを消せず、アクティブ削除時は先頭へ移る', async () => {
		const first = customPunishmentsStore.getState().sets[0].id
		await customPunishmentsStore.removeSet(first)
		expect(customPunishmentsStore.getState().sets).toHaveLength(1)
		await customPunishmentsStore.addSet('2つ目')
		const secondId = getActiveSet(customPunishmentsStore.getState()).id
		await customPunishmentsStore.removeSet(secondId)
		const s = customPunishmentsStore.getState()
		expect(s.sets).toHaveLength(1)
		expect(s.activeSetId).toBe(first)
	})

	it('セットごとにアイテムが独立している', async () => {
		await customPunishmentsStore.addItem('normal', 'セット1のお題')
		await customPunishmentsStore.addSet('セカンド')
		expect(getActiveSet(customPunishmentsStore.getState()).items).toHaveLength(0)
		await customPunishmentsStore.addItem('normal', 'セット2のお題')
		await customPunishmentsStore.selectSet(customPunishmentsStore.getState().sets[0].id)
		expect(getActiveSet(customPunishmentsStore.getState()).items[0].text).toBe('セット1のお題')
	})

	it('getActivePool は enabled=false で空を返す', async () => {
		await customPunishmentsStore.addItem('normal', 'お題')
		await customPunishmentsStore.addItem('special', '特大お題')
		let pool = getActivePool(customPunishmentsStore.getState())
		expect(pool.normals).toHaveLength(1)
		expect(pool.specials).toHaveLength(1)
		await customPunishmentsStore.setEnabled(false)
		pool = getActivePool(customPunishmentsStore.getState())
		expect(pool).toEqual({ normals: [], specials: [] })
	})

	it('hydrate が保存済み状態を復元し、不整合な activeSetId を先頭に補正する', async () => {
		await AsyncStorage.setItem(
			'waipa.inshu-suijaku.custom-punishments',
			JSON.stringify({
				enabled: false,
				activeSetId: 'ghost',
				sets: [{ id: 'set9', name: '復元セット', items: [] }],
				nextId: 10,
			}),
		)
		await customPunishmentsStore.hydrate()
		const s = customPunishmentsStore.getState()
		expect(s.enabled).toBe(false)
		expect(s.activeSetId).toBe('set9')
	})

	it('破損した保存データでも throw せずデフォルトに戻る', async () => {
		await AsyncStorage.setItem('waipa.inshu-suijaku.custom-punishments', '{broken')
		await expect(customPunishmentsStore.hydrate()).resolves.toBeUndefined()
		expect(customPunishmentsStore.getState().sets).toHaveLength(1)
	})
})
