import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { Alert } from 'react-native'
import { restorePremium } from '@/lib/premium'
import { settingsStore } from '@/lib/settings-store'
import { contactSupport, writeReview } from '@/lib/support'
import SettingsScreen from '../settings'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
	NotificationFeedbackType: { Success: 'success' },
	notificationAsync: jest.fn(),
}))
jest.mock('expo-linear-gradient', () => ({
	LinearGradient: ({ children }: { children?: import('react').ReactNode }) => children,
}))
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }))
jest.mock('@/lib/premium', () => ({
	restorePremium: jest.fn(async () => 'restored'),
}))
jest.mock('@/lib/support', () => ({
	contactSupport: jest.fn(async () => {}),
	writeReview: jest.fn(async () => {}),
}))

const restorePremiumMock = restorePremium as jest.MockedFunction<typeof restorePremium>

beforeEach(async () => {
	jest.clearAllMocks()
	await AsyncStorage.clear()
	await settingsStore.hydrate()
})

describe('設定セクション', () => {
	it('効果音とバイブレーションのトグルが表示される', async () => {
		const { getByText } = await render(<SettingsScreen />)
		expect(getByText('効果音')).toBeTruthy()
		expect(getByText('バイブレーション')).toBeTruthy()
	})

	it('トグル操作でストアが更新される', async () => {
		const { getAllByRole } = await render(<SettingsScreen />)
		fireEvent(getAllByRole('switch')[0], 'valueChange', false)
		expect(settingsStore.getState().soundEnabled).toBe(false)
	})

	it('言語行が表示される（MVPは日本語のみ）', async () => {
		const { getByText } = await render(<SettingsScreen />)
		expect(getByText('言語')).toBeTruthy()
		expect(getByText('日本語')).toBeTruthy()
	})
})

describe('プレミアム誘導カード', () => {
	it('キャッチコピーとアップグレードボタンが表示される', async () => {
		const { getByText } = await render(<SettingsScreen />)
		expect(getByText('広告なしで、もっと快適に遊ぼう！')).toBeTruthy()
		expect(getByText('アップグレード')).toBeTruthy()
	})

	it('アップグレード押下でペイウォールへ遷移する', async () => {
		const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
		const { getByText } = await render(<SettingsScreen />)
		await act(async () => {
			fireEvent.press(getByText('アップグレード'))
		})
		expect(router.push).toHaveBeenCalledWith('/paywall')
		expect(alertSpy).not.toHaveBeenCalled()
	})
})

describe('その他セクション', () => {
	it('購入を復元する・レビューを書く・要望・問い合わせの行が表示される', async () => {
		const { getByText } = await render(<SettingsScreen />)
		expect(getByText('購入を復元する')).toBeTruthy()
		expect(getByText('レビューを書く')).toBeTruthy()
		expect(getByText('要望・問い合わせ')).toBeTruthy()
	})

	it('購入を復元する押下で restorePremium を呼び、復元成功を案内する', async () => {
		restorePremiumMock.mockResolvedValueOnce('restored')
		const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
		const { getByText } = await render(<SettingsScreen />)
		await act(async () => {
			fireEvent.press(getByText('購入を復元する'))
		})
		await waitFor(() => expect(restorePremiumMock).toHaveBeenCalledTimes(1))
		expect(alertSpy).toHaveBeenCalledWith('復元しました')
	})

	it('復元できる購入がない場合は none 用の案内を表示する', async () => {
		restorePremiumMock.mockResolvedValueOnce('none')
		const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
		const { getByText } = await render(<SettingsScreen />)
		await act(async () => {
			fireEvent.press(getByText('購入を復元する'))
		})
		await waitFor(() => expect(restorePremiumMock).toHaveBeenCalledTimes(1))
		expect(alertSpy).toHaveBeenCalledWith('復元できる購入が見つかりませんでした')
	})

	it('復元エラー時はエラー案内を表示する', async () => {
		restorePremiumMock.mockResolvedValueOnce('error')
		const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
		const { getByText } = await render(<SettingsScreen />)
		await act(async () => {
			fireEvent.press(getByText('購入を復元する'))
		})
		await waitFor(() => expect(restorePremiumMock).toHaveBeenCalledTimes(1))
		expect(alertSpy).toHaveBeenCalled()
	})

	it('レビューを書く押下でストアレビューを要求する', async () => {
		const { getByText } = await render(<SettingsScreen />)
		fireEvent.press(getByText('レビューを書く'))
		expect(writeReview).toHaveBeenCalledTimes(1)
	})

	it('要望・問い合わせ押下でメールリンクを開く', async () => {
		const { getByText } = await render(<SettingsScreen />)
		fireEvent.press(getByText('要望・問い合わせ'))
		expect(contactSupport).toHaveBeenCalledTimes(1)
	})
})
