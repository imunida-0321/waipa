import { colors, radii, spacing, typography } from '../tokens'

describe('デザイントークン', () => {
	it('CLAUDE.md 指定のカラーを持つ', () => {
		expect(colors.background).toBe('#17142A')
		expect(colors.surface).toBe('#211D3A')
		expect(colors.accentFrom).toBe('#E85BF7')
		expect(colors.accentTo).toBe('#7B5CFA')
	})

	it('スペーシングは昇順', () => {
		expect(spacing.xs).toBeLessThan(spacing.sm)
		expect(spacing.sm).toBeLessThan(spacing.md)
		expect(spacing.md).toBeLessThan(spacing.lg)
		expect(spacing.lg).toBeLessThan(spacing.xl)
	})

	it('カードの角丸は大きめ（20以上）', () => {
		expect(radii.lg).toBeGreaterThanOrEqual(20)
	})

	it('タイポグラフィ各種を持つ', () => {
		expect(typography.hero.fontSize).toBeGreaterThan(typography.title.fontSize!)
		expect(typography.title.fontSize).toBeGreaterThan(typography.body.fontSize!)
		expect(typography.body.fontSize).toBeGreaterThan(typography.caption.fontSize!)
	})
})
