import { isPackUnlocked, packUnlockStore } from '@/lib/pack-unlock-store'
import { isPremiumUnlocked } from '@/lib/premium'

jest.mock('@/lib/premium', () => ({ isPremiumUnlocked: jest.fn(() => false) }))

const mockedPremium = jest.mocked(isPremiumUnlocked)

beforeEach(() => {
	jest.clearAllMocks()
	mockedPremium.mockReturnValue(false)
	packUnlockStore._resetForTest()
})

describe('packUnlockStore', () => {
	it('unlock で解放され、lock で再ロックされる', () => {
		expect(isPackUnlocked('king_premium')).toBe(false)
		packUnlockStore.unlock('king_premium')
		expect(isPackUnlocked('king_premium')).toBe(true)
		packUnlockStore.lock('king_premium')
		expect(isPackUnlocked('king_premium')).toBe(false)
	})

	it('プレミアムなら常に解放済み扱い', () => {
		mockedPremium.mockReturnValue(true)
		expect(isPackUnlocked('king_premium')).toBe(true)
	})

	it('解放は対象パックのみに効く', () => {
		packUnlockStore.unlock('king_premium')
		expect(isPackUnlocked('other_pack')).toBe(false)
	})

	it('unlock/lock で購読者に通知される', () => {
		const listener = jest.fn()
		packUnlockStore.subscribe(listener)
		packUnlockStore.unlock('king_premium')
		packUnlockStore.lock('king_premium')
		expect(listener).toHaveBeenCalledTimes(2)
	})
})
