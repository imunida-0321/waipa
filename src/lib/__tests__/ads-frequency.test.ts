import type * as AdsMock from '../../../__mocks__/react-native-google-mobile-ads'
import { initAds, maybeShowGameExitInterstitial, _resetForTest } from '@/lib/ads'

jest.mock('react-native-google-mobile-ads')
jest.mock('expo-tracking-transparency')
jest.mock('@/lib/premium', () => ({ isPremiumUnlocked: jest.fn(() => false) }))
jest.mock('@/constants/ads', () => ({
	...jest.requireActual('@/constants/ads'),
	INTERSTITIAL_EVERY_N_EXITS: 3,
}))

const adsMock = jest.requireMock('react-native-google-mobile-ads') as typeof AdsMock

beforeEach(() => {
	jest.clearAllMocks()
	adsMock._resetAdsMock()
	_resetForTest()
})

it('N=3 のとき 3 回目の退出でだけ表示する', async () => {
	await initAds()
	const ad = adsMock._interstitials[0]
	ad._emit('loaded')
	maybeShowGameExitInterstitial()
	maybeShowGameExitInterstitial()
	expect(ad.show).not.toHaveBeenCalled()
	maybeShowGameExitInterstitial()
	expect(ad.show).toHaveBeenCalledTimes(1)
})
