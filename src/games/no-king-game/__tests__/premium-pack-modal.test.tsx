import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { useRewardedAd } from 'react-native-google-mobile-ads'
import { AD_UNIT_IDS } from '@/constants/ads'
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

type RewardedState = ReturnType<typeof useRewardedAd>

// v17 のオプション形式（useRewardedAd({ adUnitId, autoLoad })）の戻り値
function hookState(overrides: Partial<RewardedState>): RewardedState {
	return {
		status: 'idle',
		error: null,
		autoLoad: false,
		clicked: false,
		impression: false,
		revenue: null,
		responseInfo: null,
		reward: null,
		earnedReward: false,
		load: jest.fn(),
		show: jest.fn(),
		destroy: jest.fn(),
		retry: jest.fn(),
		...overrides,
	} as RewardedState
}

beforeEach(() => {
	jest.clearAllMocks()
	packUnlockStore._resetForTest()
	getTopicsByPackMock.mockReturnValue([])
	refreshPremiumPackMock.mockResolvedValue(true)
	mockedHook.mockReturnValue(hookState({}))
})

// RNTL v14 の要素型と react-test-renderer の型が非互換のため、必要な形だけの構造的型で受ける
type AncestorNode = { parent: AncestorNode | null; props: { testID?: unknown } }

function hasAncestorTestId(node: AncestorNode, testID: string): boolean {
	let current = node.parent
	while (current) {
		if (current.props.testID === testID) return true
		current = current.parent
	}
	return false
}

describe('PremiumPackModal', () => {
	it('表示時にリワードを読み込み、未ロード中はボタンが無効', async () => {
		const state = hookState({})
		mockedHook.mockReturnValue(state)
		const { getByText, getByTestId, queryByText } = await render(
			<PremiumPackModal visible onClose={() => {}} />,
		)
		// 非推奨の位置引数形式ではなくオプション形式で呼び、読み込みは表示時に明示的に行う
		expect(mockedHook).toHaveBeenCalledWith({
			adUnitId: AD_UNIT_IDS.packUnlockRewarded,
			autoLoad: false,
		})
		expect(state.load).toHaveBeenCalled()
		await waitFor(() => {
			expect(refreshPremiumPackMock).toHaveBeenCalledWith('king_premium')
		})
		expect(getByTestId('icon-lock')).toBeTruthy()
		expect(queryByText('🔒')).toBeNull()
		expect(getByText('動画を見て解放する').props.disabled ?? true).toBeTruthy()
	})

	it('ロード済みならタップで動画を表示する', async () => {
		const state = hookState({ status: 'loaded' })
		mockedHook.mockReturnValue(state)
		const { getByText } = await render(<PremiumPackModal visible onClose={() => {}} />)
		fireEvent.press(getByText('動画を見て解放する'))
		expect(state.show).toHaveBeenCalledTimes(1)
	})

	it('視聴完了時にプレミアムお題を取得済みならパックを解放する', async () => {
		getTopicsByPackMock.mockReturnValue([premiumTopic])
		mockedHook.mockReturnValue(hookState({ status: 'closed', earnedReward: true }))
		await render(<PremiumPackModal visible onClose={() => {}} />)
		expect(isPackUnlocked('king_premium')).toBe(true)
		expect(getTopicsByPackMock).toHaveBeenCalledWith('king_premium')
	})

	it('視聴完了時にプレミアムお題の取得へ失敗したら解放せず再試行を表示する', async () => {
		getTopicsByPackMock.mockReturnValue([])
		refreshPremiumPackMock.mockResolvedValue(false)
		mockedHook.mockReturnValue(hookState({ status: 'closed', earnedReward: true }))
		const { getByText } = await render(<PremiumPackModal visible onClose={() => {}} />)

		await waitFor(() => {
			expect(isPackUnlocked('king_premium')).toBe(false)
		})
		expect(getByText('お題の取得に失敗しました')).toBeTruthy()
		expect(getByText('再試行')).toBeTruthy()
	})

	it('視聴完了後に200でお題が0件だったら解放せず再試行を表示する', async () => {
		const { topicsStore: actualTopicsStore } =
			jest.requireActual<typeof import('@/lib/topics-store')>('@/lib/topics-store')
		actualTopicsStore._resetForTest()
		const originalFetch = globalThis.fetch
		globalThis.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [],
		}) as unknown as typeof fetch
		// 空レスポンスの成否判定は実際のストアに任せる。
		refreshPremiumPackMock.mockImplementation(actualTopicsStore.refreshPremiumPack)
		getTopicsByPackMock.mockReturnValue([])
		mockedHook.mockReturnValue(hookState({ status: 'closed', earnedReward: true }))

		try {
			const { getByText, queryByText } = await render(
				<PremiumPackModal visible onClose={() => {}} />,
			)

			expect(refreshPremiumPackMock).toHaveBeenCalledWith('king_premium')
			expect(globalThis.fetch).toHaveBeenCalled()
			await waitFor(() => {
				expect(isPackUnlocked('king_premium')).toBe(false)
				expect(getByText('お題の取得に失敗しました')).toBeTruthy()
				expect(getByText('再試行')).toBeTruthy()
				expect(queryByText(/解放中/)).toBeNull()
			})
		} finally {
			globalThis.fetch = originalFetch
			actualTopicsStore._resetForTest()
		}
	})

	it('再試行でプレミアムお題の取得に成功したら動画を再視聴せず解放する', async () => {
		getTopicsByPackMock.mockReturnValue([])
		refreshPremiumPackMock.mockResolvedValue(false)
		const state = hookState({ status: 'closed', earnedReward: true })
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

	it('シートはガラス面で描画される', async () => {
		const { getByText } = await render(<PremiumPackModal visible onClose={() => {}} />)

		expect(hasAncestorTestId(getByText('限定お題パック'), 'glass-surface-blur')).toBe(true)
	})
})
