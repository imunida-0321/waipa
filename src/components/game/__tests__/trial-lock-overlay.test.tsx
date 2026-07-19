import { act, fireEvent, render } from '@testing-library/react-native'
import { router } from 'expo-router'
import { usePremium } from '@/lib/premium'
import { TrialLockOverlay } from '../trial-lock-overlay'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))
jest.mock('@/lib/premium', () => ({ usePremium: jest.fn(() => false) }))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

const mockedUsePremium = jest.mocked(usePremium)

type TrialStoreModule = {
	trialStore: {
		_resetForTest: () => void
		startTrial: (gameId: string) => Promise<void>
		consumeRound: (gameId: string) => void
	}
}

function requireTrialStore() {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return require('@/lib/trial-store') as TrialStoreModule
}

beforeEach(() => {
	jest.clearAllMocks()
	mockedUsePremium.mockReturnValue(false)
})

it('お試しを消費し切った非プレミアムユーザーにはロックオーバーレイを表示する', async () => {
	const { trialStore } = requireTrialStore()
	trialStore._resetForTest()
	await trialStore.startTrial('burst-chicken')
	trialStore.consumeRound('burst-chicken')
	trialStore.consumeRound('burst-chicken')

	const { getByTestId, getByText } = await render(<TrialLockOverlay gameId="burst-chicken" />)

	expect(getByTestId('trial-lock-overlay')).toBeTruthy()
	expect(getByText('お試しはここまで！')).toBeTruthy()
	expect(getByText('続きは WaiPa プレミアムで遊べます。')).toBeTruthy()
	expect(getByText('プレミアムにアップグレード')).toBeTruthy()
	expect(getByText('ホームへ戻る')).toBeTruthy()
})

it('未消費・非トライアル・プレミアムでは表示しない', async () => {
	const { trialStore } = requireTrialStore()
	trialStore._resetForTest()
	const { queryByTestId, rerender } = await render(
		<TrialLockOverlay gameId="burst-chicken" />,
	)
	expect(queryByTestId('trial-lock-overlay')).toBeNull()

	await trialStore.startTrial('burst-chicken')
	trialStore.consumeRound('burst-chicken')
	trialStore.consumeRound('burst-chicken')
	mockedUsePremium.mockReturnValue(true)
	await act(async () => {
		rerender(<TrialLockOverlay gameId="burst-chicken" />)
	})
	expect(queryByTestId('trial-lock-overlay')).toBeNull()
})

it('アップグレードとホーム導線で正しい遷移を呼ぶ', async () => {
	const { trialStore } = requireTrialStore()
	trialStore._resetForTest()
	await trialStore.startTrial('burst-chicken')
	trialStore.consumeRound('burst-chicken')
	trialStore.consumeRound('burst-chicken')
	const { getByText } = await render(<TrialLockOverlay gameId="burst-chicken" />)

	await act(async () => {
		fireEvent.press(getByText('プレミアムにアップグレード'))
	})
	expect(router.push).toHaveBeenCalledWith('/paywall')

	await act(async () => {
		fireEvent.press(getByText('ホームへ戻る'))
	})
	expect(router.back).toHaveBeenCalledTimes(1)
})
