import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { useRewardedAd } from 'react-native-google-mobile-ads'
import { AD_UNIT_IDS } from '@/constants/ads'
import { PremiumLockModal } from '../premium-lock-modal'

jest.mock('react-native-google-mobile-ads')
jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))
jest.mock('@/lib/premium', () => ({
	isPremiumUnlocked: jest.fn(() => false),
	usePremium: jest.fn(() => false),
}))

const mockedRewardedAd = jest.mocked(useRewardedAd)
const storageKey = 'waipa.trials.used'

type RewardedState = ReturnType<typeof useRewardedAd>

// v17 のオプション形式（useRewardedAd({ adUnitId, autoLoad })）の戻り値
function rewardedState(overrides: Partial<RewardedState>): RewardedState {
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

type TrialStoreModule = {
	trialStore: {
		_resetForTest: () => void
		startTrial: (gameId: string) => Promise<void>
		endTrial: () => void
	}
	isTrialActive: (gameId: string) => boolean
}

function requireTrialStore() {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return require('@/lib/trial-store') as TrialStoreModule
}

beforeEach(async () => {
	jest.clearAllMocks()
	await AsyncStorage.clear()
	mockedRewardedAd.mockReturnValue(rewardedState({}))
})

it('ゲーム名とプレミアム案内、アップグレード導線を表示する', async () => {
	const { getByText, getByTestId, queryByText } = await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={jest.fn()}
		/>,
	)
	expect(getByTestId('icon-crown')).toBeTruthy()
	expect(queryByText('👑')).toBeNull()
	expect(getByText('バーストチキン')).toBeTruthy()
	expect(getByText(/WaiPa プレミアムで遊べます/)).toBeTruthy()
	expect(queryByText('近日対応予定')).toBeNull()
	expect(getByText('プレミアムにアップグレード')).toBeTruthy()
})

it('アップグレードボタンでモーダルを閉じてペイウォールへ遷移する', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={onClose}
		/>,
	)
	fireEvent.press(getByText('プレミアムにアップグレード'))
	expect(onClose).toHaveBeenCalledTimes(1)
	expect(router.push).toHaveBeenCalledWith('/paywall')
})

it('とじるリンクで onClose が呼ばれる', async () => {
	const onClose = jest.fn()
	const { getByText } = await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={onClose}
		/>,
	)
	fireEvent.press(getByText('とじる'))
	expect(onClose).toHaveBeenCalled()
})

it('visible=false では何も表示しない', async () => {
	const { queryByText } = await render(
		<PremiumLockModal
			visible={false}
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={jest.fn()}
		/>,
	)
	expect(queryByText('プレミアムにアップグレード')).toBeNull()
})

it('お試し可能なら1回きりの説明と動画ボタンを表示し、表示時にリワード動画を読み込む', async () => {
	const state = rewardedState({})
	mockedRewardedAd.mockReturnValue(state)

	const { getByText, getByRole } = await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={jest.fn()}
		/>,
	)

	expect(AD_UNIT_IDS.trialRewarded).toBe('test-rewarded')
	// 非推奨の位置引数形式ではなくオプション形式で呼び、読み込みはモーダル表示時に明示的に行う
	expect(mockedRewardedAd).toHaveBeenCalledWith({
		adUnitId: AD_UNIT_IDS.trialRewarded,
		autoLoad: false,
	})
	expect(state.load).toHaveBeenCalledTimes(1)
	expect(getByText('動画を見ると2ラウンドだけお試しできます。お試しは1回だけです。')).toBeTruthy()
	expect(
		getByRole('button', { name: '動画を見てお試しプレイ' }).props.accessibilityState,
	).toEqual(expect.objectContaining({ disabled: true }))
})

it('リワード動画ロード済みならお試しボタンで動画を表示する', async () => {
	const state = rewardedState({ status: 'loaded' })
	mockedRewardedAd.mockReturnValue(state)

	const { getByText } = await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={jest.fn()}
		/>,
	)

	fireEvent.press(getByText('動画を見てお試しプレイ'))
	expect(state.show).toHaveBeenCalledTimes(1)
})

it('リワード獲得後に startTrial して閉じ、対象ゲームへ遷移する', async () => {
	const onClose = jest.fn()
	mockedRewardedAd.mockReturnValue(rewardedState({ status: 'closed', earnedReward: true }))

	await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={onClose}
		/>,
	)

	await waitFor(() => {
		expect(router.push).toHaveBeenCalledWith('/game/burst-chicken')
	})
	await expect(AsyncStorage.getItem(storageKey)).resolves.toBe(JSON.stringify(['burst-chicken']))
	expect(onClose).toHaveBeenCalledTimes(1)
})

it('リワードを獲得しても、広告を閉じるまではお試しを始めず、閉じも遷移もしない（issue #168）', async () => {
	const { trialStore, isTrialActive } = requireTrialStore()
	trialStore._resetForTest()
	const onClose = jest.fn()
	// リワードの獲得は、広告がまだ画面に出ているうち（showing）に通知される
	mockedRewardedAd.mockReturnValue(rewardedState({ status: 'showing', earnedReward: true }))
	const { rerender } = await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={onClose}
		/>,
	)
	await act(async () => {})

	expect(isTrialActive('burst-chicken')).toBe(false)
	expect(onClose).not.toHaveBeenCalled()
	expect(router.push).not.toHaveBeenCalled()

	// 広告を閉じたら、お試しを始めてゲームへ進む
	mockedRewardedAd.mockReturnValue(rewardedState({ status: 'closed', earnedReward: true }))
	await rerender(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={onClose}
		/>,
	)

	await waitFor(() => {
		expect(router.push).toHaveBeenCalledWith('/game/burst-chicken')
	})
	expect(onClose).toHaveBeenCalledTimes(1)
})

it('お試し利用済みなら利用済みキャプションを表示し、お試しボタンは出さない', async () => {
	const { trialStore } = requireTrialStore()
	trialStore._resetForTest()
	await trialStore.startTrial('burst-chicken')
	trialStore.endTrial()

	const { getByText, queryByText } = await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={jest.fn()}
		/>,
	)

	expect(getByText('お試しプレイは利用済みです')).toBeTruthy()
	expect(queryByText('動画を見てお試しプレイ')).toBeNull()
})

it('別のゲームで開き直したとき、再度リワード獲得でお試しを開始できる', async () => {
	const { trialStore } = requireTrialStore()
	trialStore._resetForTest()
	const onClose = jest.fn()
	mockedRewardedAd.mockReturnValue(rewardedState({ status: 'closed', earnedReward: true }))
	const { rerender } = await render(
		<PremiumLockModal
			visible
			gameId="burst-chicken"
			gameTitle="バーストチキン"
			onClose={onClose}
		/>,
	)
	await waitFor(() => expect(router.push).toHaveBeenCalledWith('/game/burst-chicken'))

	mockedRewardedAd.mockReturnValue(rewardedState({}))
	await rerender(<PremiumLockModal visible={false} gameId="" gameTitle="" onClose={onClose} />)
	mockedRewardedAd.mockReturnValue(rewardedState({ status: 'closed', earnedReward: true }))
	await rerender(
		<PremiumLockModal visible gameId="daut-dice" gameTitle="ダウトダイス" onClose={onClose} />,
	)

	await waitFor(() => expect(router.push).toHaveBeenCalledWith('/game/daut-dice'))
	await expect(AsyncStorage.getItem(storageKey)).resolves.toBe(
		JSON.stringify(['burst-chicken', 'daut-dice']),
	)
})

describe('Task 7 Step 1', () => {
	it('シートはガラス面（overlay）で描画される', async () => {
		const { getByTestId } = await render(
			<PremiumLockModal visible gameId="chinchiro" gameTitle="チンチロ" onClose={() => {}} />,
		)
		expect(getByTestId('glass-surface-blur')).toBeTruthy()
	})
})
