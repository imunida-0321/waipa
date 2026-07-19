import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook } from '@testing-library/react-native'
import { TRIAL_ROUNDS } from '@/constants/trial'
import { isPremiumUnlocked } from '@/lib/premium'
import {
	canOfferTrial,
	isTrialActive,
	isTrialExhausted,
	isTrialUsed,
	trialStore,
	useTrialOffer,
	useTrialRoundConsumer,
} from '../trial-store'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/premium', () => ({ isPremiumUnlocked: jest.fn(() => false) }))

const mockedPremium = jest.mocked(isPremiumUnlocked)
const storageKey = 'waipa.trials.used'

beforeEach(async () => {
	jest.clearAllMocks()
	mockedPremium.mockReturnValue(false)
	trialStore._resetForTest()
	await AsyncStorage.clear()
})

describe('trialStore', () => {
	it('hydrate は保存済みのお試し済み gameId を復元する', async () => {
		await AsyncStorage.setItem(storageKey, JSON.stringify(['burst-chicken']))

		await trialStore.hydrate()

		expect(isTrialUsed('burst-chicken')).toBe(true)
		expect(canOfferTrial('burst-chicken')).toBe(false)
		expect(canOfferTrial('daut-dice')).toBe(true)
	})

	it('hydrate は破損データを空扱いにする', async () => {
		await AsyncStorage.setItem(storageKey, '{broken')

		await trialStore.hydrate()

		expect(isTrialUsed('burst-chicken')).toBe(false)
		expect(canOfferTrial('burst-chicken')).toBe(true)
	})

	it('startTrial は開始時点で used に追加して即永続化し、残ラウンドを 0 で開始する', async () => {
		await trialStore.startTrial('burst-chicken')

		expect(AsyncStorage.setItem).toHaveBeenCalledWith(
			storageKey,
			JSON.stringify(['burst-chicken']),
		)
		expect(isTrialUsed('burst-chicken')).toBe(true)
		expect(isTrialActive('burst-chicken')).toBe(true)
		expect(isTrialExhausted('burst-chicken')).toBe(false)
	})

	it('お試しは1回きりで、再起動相当の hydrate 後も再オファーしない', async () => {
		await trialStore.startTrial('burst-chicken')
		trialStore._resetForTest()

		await trialStore.hydrate()

		expect(isTrialUsed('burst-chicken')).toBe(true)
		expect(canOfferTrial('burst-chicken')).toBe(false)
		expect(isTrialActive('burst-chicken')).toBe(false)
	})

	it('consumeRound は active の gameId に一致する場合だけ消費し、2ラウンドで exhausted になる', async () => {
		await trialStore.startTrial('burst-chicken')

		trialStore.consumeRound('daut-dice')
		expect(isTrialExhausted('burst-chicken')).toBe(false)

		trialStore.consumeRound('burst-chicken')
		expect(isTrialExhausted('burst-chicken')).toBe(false)

		trialStore.consumeRound('burst-chicken')
		expect(isTrialExhausted('burst-chicken')).toBe(true)
	})

	it('consumeRound は active が無い場合 no-op', () => {
		trialStore.consumeRound('burst-chicken')
		trialStore.consumeRound('burst-chicken')

		expect(isTrialActive('burst-chicken')).toBe(false)
		expect(isTrialExhausted('burst-chicken')).toBe(false)
	})

	it('endTrial はメモリ上の active だけを終了し、used は残す', async () => {
		await trialStore.startTrial('burst-chicken')

		trialStore.endTrial()

		expect(isTrialActive('burst-chicken')).toBe(false)
		expect(isTrialExhausted('burst-chicken')).toBe(false)
		expect(isTrialUsed('burst-chicken')).toBe(true)
	})

	it('プレミアム購読者にはお試しをオファーしない', () => {
		mockedPremium.mockReturnValue(true)

		expect(canOfferTrial('burst-chicken')).toBe(false)
	})

	it('useTrialOffer は startTrial に追従する', async () => {
		const { result } = await renderHook(() => useTrialOffer('burst-chicken'))

		expect(result.current).toEqual({ canOffer: true, used: false })

		await act(async () => {
			await trialStore.startTrial('burst-chicken')
		})

		expect(result.current).toEqual({ canOffer: false, used: true })
	})

	it('useTrialRoundConsumer は false→true 遷移ごとに1回だけラウンド消費する', async () => {
		await trialStore.startTrial('burst-chicken')
		const consumeSpy = jest.spyOn(trialStore, 'consumeRound')
		const { rerender } = await renderHook(
			({ isRoundEnd }: { isRoundEnd: boolean }) =>
				useTrialRoundConsumer('burst-chicken', isRoundEnd),
			{ initialProps: { isRoundEnd: false } },
		)

		await act(async () => {
			rerender({ isRoundEnd: true })
		})
		expect(consumeSpy).toHaveBeenCalledTimes(1)
		expect(consumeSpy).toHaveBeenLastCalledWith('burst-chicken')
		expect(isTrialExhausted('burst-chicken')).toBe(false)

		await act(async () => {
			rerender({ isRoundEnd: true })
		})
		expect(consumeSpy).toHaveBeenCalledTimes(1)

		await act(async () => {
			rerender({ isRoundEnd: false })
		})
		await act(async () => {
			rerender({ isRoundEnd: true })
		})
		expect(consumeSpy).toHaveBeenCalledTimes(TRIAL_ROUNDS)
		expect(isTrialExhausted('burst-chicken')).toBe(true)
	})
})
