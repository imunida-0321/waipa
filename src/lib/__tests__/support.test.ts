import * as Linking from 'expo-linking'
import * as StoreReview from 'expo-store-review'
import { contactSupport, SUPPORT_EMAIL, writeReview } from '../support'

jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => true) }))
jest.mock('expo-store-review', () => ({
	hasAction: jest.fn(async () => true),
	requestReview: jest.fn(async () => {}),
}))

beforeEach(() => {
	jest.clearAllMocks()
})

describe('contactSupport', () => {
	it('サポート宛の mailto リンクを開く', async () => {
		await contactSupport()
		expect(Linking.openURL).toHaveBeenCalledTimes(1)
		const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string
		expect(url.startsWith(`mailto:${SUPPORT_EMAIL}`)).toBe(true)
		expect(url).toContain('subject=')
	})

	it('メールアプリを開けなくても例外を投げない', async () => {
		;(Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no mail app'))
		await expect(contactSupport()).resolves.toBeUndefined()
	})
})

describe('writeReview', () => {
	it('レビューAPIが使えるときはアプリ内レビューを要求する', async () => {
		;(StoreReview.hasAction as jest.Mock).mockResolvedValueOnce(true)
		await writeReview()
		expect(StoreReview.requestReview).toHaveBeenCalledTimes(1)
	})

	it('レビューAPIが使えないときは何もしない', async () => {
		;(StoreReview.hasAction as jest.Mock).mockResolvedValueOnce(false)
		await writeReview()
		expect(StoreReview.requestReview).not.toHaveBeenCalled()
	})
})
