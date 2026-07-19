// react-native-google-mobile-ads の手動モック（全テストに自動適用）。
// _emit でネイティブ広告イベントを擬似発火し、_interstitials / _rewardeds で生成済み広告を参照できる
type Listener = (payload?: unknown) => void

export type MockAd = {
	addAdEventListener: jest.Mock
	load: jest.Mock
	show: jest.Mock
	_emit: (type: string, payload?: unknown) => void
}

function makeAd(): MockAd {
	const own = new Map<string, Set<Listener>>()
	return {
		addAdEventListener: jest.fn((type: string, fn: Listener) => {
			if (!own.has(type)) own.set(type, new Set())
			own.get(type)?.add(fn)
			return () => own.get(type)?.delete(fn)
		}),
		load: jest.fn(),
		show: jest.fn(),
		_emit(type: string, payload?: unknown) {
			own.get(type)?.forEach((fn) => fn(payload))
		},
	}
}

export const _interstitials: MockAd[] = []
export const _rewardeds: MockAd[] = []

export const _initialize = jest.fn(async () => [])
const mobileAds = jest.fn(() => ({ initialize: _initialize }))
export default mobileAds

export const TestIds = {
	ADAPTIVE_BANNER: 'test-adaptive-banner',
	INTERSTITIAL: 'test-interstitial',
	REWARDED: 'test-rewarded',
}

export const AdEventType = { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' }
export const RewardedAdEventType = {
	LOADED: 'rewarded_loaded',
	EARNED_REWARD: 'rewarded_earned_reward',
}
export const BannerAdSize = { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' }

export const InterstitialAd = {
	createForAdRequest: jest.fn(() => {
		const ad = makeAd()
		_interstitials.push(ad)
		return ad
	}),
}

export const RewardedAd = {
	createForAdRequest: jest.fn(() => {
		const ad = makeAd()
		_rewardeds.push(ad)
		return ad
	}),
}

export const BannerAd = () => null

export const useRewardedAd = jest.fn(() => ({
	isLoaded: false,
	isEarnedReward: false,
	error: undefined,
	load: jest.fn(),
	show: jest.fn(),
}))

export const useForeground = jest.fn()

export function _resetAdsMock() {
	_interstitials.length = 0
	_rewardeds.length = 0
	_initialize.mockClear()
	InterstitialAd.createForAdRequest.mockClear()
	RewardedAd.createForAdRequest.mockClear()
}
