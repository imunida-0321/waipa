import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { useRewardedAd } from 'react-native-google-mobile-ads'
import { PremiumPackModal } from '@/games/no-king-game/premium-pack-modal'
import { isPackUnlocked, packUnlockStore } from '@/lib/pack-unlock-store'
import { getTopicsByPack, topicsStore, type Topic } from '@/lib/topics-store'

jest.mock('react-native-google-mobile-ads')
jest.mock('@/lib/premium', () => ({ isPremiumUnlocked: jest.fn(() => false) }))
jest.mock('@/lib/topics-store', () => ({
	getTopicsByPack: jest.fn(() => []),
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
const getTopicsByPackMock = jest.mocked(getTopicsByPack)
const refreshPremiumPackMock = jest.mocked(topicsStore.refreshPremiumPack)

const premiumTopic: Topic = {
	id: 'premium-1',
	pack: 'king_premium',
	text: '限定お題',
}

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
	getTopicsByPackMock.mockReturnValue([])
	refreshPremiumPackMock.mockResolvedValue(true)
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
		await waitFor(() => {
			expect(refreshPremiumPackMock).toHaveBeenCalledWith('king_premium')
		})
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

	it('視聴完了時にプレミアムお題を取得済みならパックを解放する', async () => {
		getTopicsByPackMock.mockReturnValue([premiumTopic])
		mockedHook.mockReturnValue(hookState({ isEarnedReward: true }))
		await render(<PremiumPackModal visible onClose={() => {}} />)
		expect(isPackUnlocked('king_premium')).toBe(true)
		expect(getTopicsByPackMock).toHaveBeenCalledWith('king_premium')
	})

	it('視聴完了時にプレミアムお題の取得へ失敗したら解放せず再試行を表示する', async () => {
		getTopicsByPackMock.mockReturnValue([])
		refreshPremiumPackMock.mockResolvedValue(false)
		mockedHook.mockReturnValue(hookState({ isEarnedReward: true }))
		const { getByText } = await render(<PremiumPackModal visible onClose={() => {}} />)

		await waitFor(() => {
			expect(isPackUnlocked('king_premium')).toBe(false)
		})
		expect(getByText('お題の取得に失敗しました')).toBeTruthy()
		expect(getByText('再試行')).toBeTruthy()
	})

	it('再試行でプレミアムお題の取得に成功したら動画を再視聴せず解放する', async () => {
		getTopicsByPackMock.mockReturnValue([])
		refreshPremiumPackMock.mockResolvedValue(false)
		const state = hookState({ isEarnedReward: true })
		mockedHook.mockReturnValue(state)
		const { getByText } = await render(<PremiumPackModal visible onClose={() => {}} />)

		await waitFor(() => {
			expect(getByText('再試行')).toBeTruthy()
		})

		refreshPremiumPackMock.mockResolvedValue(true)
		fireEvent.press(getByText('再試行'))

		await waitFor(() => {
			expect(isPackUnlocked('king_premium')).toBe(true)
		})
		expect(state.show).not.toHaveBeenCalled()
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
