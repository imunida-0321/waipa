import { glass } from '../tokens'

describe('glass トークン', () => {
	it('疑似ガラスの塗りは不透明度 0.72 を下回らない', () => {
		expect(glass.fallbackFill).toBe('rgba(33, 29, 58, 0.72)')
	})

	it('ハイライト枠線・blur 強度・紫ティントを定義する', () => {
		expect(glass.borderHighlight).toBe('rgba(255, 255, 255, 0.14)')
		expect(glass.blurIntensity).toBe(40)
		expect(glass.tint).toBe('rgba(123, 92, 250, 0.10)')
	})
})
