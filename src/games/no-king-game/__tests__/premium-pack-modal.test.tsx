import { fireEvent, render } from '@testing-library/react-native'
import { useRewardedAd } from 'react-native-google-mobile-ads'
import { PremiumPackModal } from '@/games/no-king-game/premium-pack-modal'
import { isPackUnlocked, packUnlockStore } from '@/lib/pack-unlock-store'
import { topicsStore } from '@/lib/topics-store'

jest.mock('react-native-google-mobile-ads')
jest.mock('@/lib/premium', () => ({ isPremiumUnlocked: jest.fn(() => false) }))
jest.mock('@/lib/topics-store', () => ({
	topicsStore: { refreshPremiumPack: jest.fn(async () => true) },
}))
jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native') as typeof import('react-native')
	return { LinearGradient: View }
})

const mockedHook = jest.mocked(useRewardedAd)

function hookState(overrides: Partial<ReturnType<typeof useRewardedAd>>) {
	return {
		isLoaded: false,
		isEarnedReward: false,
		error: undefined,
		load: jest.fn(),
		show: jest.fn(),
		...overrides,
	} as ReturnType<typeof useRewardedAd>
}

beforeEach(() => {
	jest.clearAllMocks()
	packUnlockStore._resetForTest()
	mockedHook.mockReturnValue(hookState({}))
})

describe('PremiumPackModal', () => {
	it('表示時にリワードを読み込み、未ロード中はボタンが無効', async () => {
		const state = hookState({})
		mockedHook.mockReturnValue(state)
		const { getByText, getByTestId, queryByText } = await render(
			<PremiumPackModal visible onClose={() => {}} />,
		)
		expect(state.load).toHaveBeenCalled()
		expect(getByTestId('icon-lock')).toBeTruthy()
		expect(queryByText('🔒')).toBeNull()
		expect(getByText('動画を見て解放する').props.disabled ?? true).toBeTruthy()
	})

	it('ロード済みならタップで動画を表示する', async () => {
		const state = hookState({ isLoaded: true })
		mockedHook.mockReturnValue(state)
		const { getByText } = await render(<PremiumPackModal visible onClose={() => {}} />)
		fireEvent.press(getByText('動画を見て解放する'))
		expect(state.show).toHaveBeenCalledTimes(1)
	})

	it('視聴完了でパックを解放しプレミアムお題を取得する', async () => {
		mockedHook.mockReturnValue(hookState({ isEarnedReward: true }))
		await render(<PremiumPackModal visible onClose={() => {}} />)
		expect(isPackUnlocked('king_premium')).toBe(true)
		expect(topicsStore.refreshPremiumPack).toHaveBeenCalledWith('king_premium')
	})

	it('解放済みなら解放済み表示になり動画ボタンを出さない', async () => {
		packUnlockStore.unlock('king_premium')
		const { queryByText, getByText } = await render(
			<PremiumPackModal visible onClose={() => {}} />,
		)
		expect(queryByText('動画を見て解放する')).toBeNull()
		expect(getByText(/解放中/)).toBeTruthy()
	})
})
