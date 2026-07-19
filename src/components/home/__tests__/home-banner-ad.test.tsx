import { render } from '@testing-library/react-native'
import { HomeBannerAd } from '@/components/home/home-banner-ad'
import { adsEnabled } from '@/lib/ads'

jest.mock('react-native-google-mobile-ads')
jest.mock('@/lib/ads', () => ({ adsEnabled: jest.fn(() => true) }))
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

const mockedEnabled = jest.mocked(adsEnabled)

describe('HomeBannerAd', () => {
	it('広告有効ならバナー枠を表示する', async () => {
		const { getByTestId } = await render(<HomeBannerAd />)
		expect(getByTestId('home-banner-ad')).toBeTruthy()
	})

	it('プレミアム（広告無効）なら何も描画しない', async () => {
		mockedEnabled.mockReturnValue(false)
		const { queryByTestId } = await render(<HomeBannerAd />)
		expect(queryByTestId('home-banner-ad')).toBeNull()
	})
})
