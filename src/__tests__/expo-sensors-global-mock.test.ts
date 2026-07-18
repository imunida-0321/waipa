import { Accelerometer } from 'expo-sensors'

// use-shake.ts が推移的に実 expo-sensors → expo 本体（Expo.fx.tsx の副作用チェーン）を
// 読み込むと、jest-expo 内部モックの解決ずれ次第で全スイートがロード時に落ちうる（#111）。
// jest.setup.js のグローバルモックが効いていることを契約として検証する。
// （use-shake.test.ts のような個別 jest.mock はこのグローバルモックより優先される）
describe('expo-sensors のグローバルモック', () => {
	it('Accelerometer はスタブに差し替えられている', () => {
		expect(jest.isMockFunction(Accelerometer.isAvailableAsync)).toBe(true)
		expect(jest.isMockFunction(Accelerometer.setUpdateInterval)).toBe(true)
		expect(jest.isMockFunction(Accelerometer.addListener)).toBe(true)
	})

	it('既定ではセンサー利用不可を返し、購読は remove できる', async () => {
		await expect(Accelerometer.isAvailableAsync()).resolves.toBe(false)
		const sub = Accelerometer.addListener(() => {})
		expect(typeof sub.remove).toBe('function')
	})
})
