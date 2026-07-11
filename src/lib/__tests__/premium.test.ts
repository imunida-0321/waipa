import { isPremiumUnlocked } from '../premium'

const g = globalThis as unknown as { __DEV__?: boolean }

it('開発ビルド（__DEV__=true）では解放', () => {
	expect(isPremiumUnlocked()).toBe(true) // jest は __DEV__=true
})

it('本番ビルド（__DEV__=false）ではロック', () => {
	const orig = g.__DEV__
	g.__DEV__ = false
	expect(isPremiumUnlocked()).toBe(false)
	g.__DEV__ = orig
})
