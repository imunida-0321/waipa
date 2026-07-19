import { fireEvent, render, waitFor } from '@testing-library/react-native'
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

function rewardedState(overrides: Partial<ReturnType<typeof useRewardedAd>>) {
	return {
		isLoaded: false,
		isEarnedReward: false,
		error: undefined,
		load: jest.fn(),
		show: jest.fn(),
		...overrides,
	} as ReturnType<typeof useRewardedAd>
}

type TrialStoreModule = {
	trialStore: {
		_resetForTest: () => void
		startTrial: (gameId: string) => Promise<void>
		endTrial: () => void
	}
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
	expect(mockedRewardedAd).toHaveBeenCalledWith(AD_UNIT_IDS.trialRewarded)
	expect(state.load).toHaveBeenCalledTimes(1)
	expect(
		getByText('動画を見ると2ラウンドだけお試しできます。お試しは1回だけです。'),
	).toBeTruthy()
	expect(getByRole('button', { name: '動画を見てお試しプレイ' }).props.accessibilityState).toEqual(
		expect.objectContaining({ disabled: true }),
	)
})

it('リワード動画ロード済みならお試しボタンで動画を表示する', async () => {
	const state = rewardedState({ isLoaded: true })
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
	mockedRewardedAd.mockReturnValue(rewardedState({ isLoaded: true, isEarnedReward: true }))

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
