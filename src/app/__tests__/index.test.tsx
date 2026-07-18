import type { ReactNode } from 'react'
import { render } from '@testing-library/react-native'
import HomeScreen from '../index'

jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: jest.fn(() => ({
		top: 12,
		bottom: 0,
		left: 0,
		right: 0,
	})),
}))
jest.mock('expo-router', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return {
		Link: ({ children }: { children: ReactNode }) => <Text>{children}</Text>,
	}
})
jest.mock('@/components/home/home-header', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return { HomeHeader: () => <Text>ホームヘッダー</Text> }
})
jest.mock('@/components/home/hero-banner', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return { HeroBanner: () => <Text>ヒーローバナー</Text> }
})
jest.mock('@/components/home/game-grid', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return { GameGrid: () => <Text>ゲームグリッド</Text> }
})
jest.mock('@/components/ui/section-header', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Text } = require('react-native')
	return { SectionHeader: ({ title }: { title: string }) => <Text>{title}</Text> }
})

describe('HomeScreen', () => {
	it('ホームの主要ブロックと開発用ギャラリーリンクを表示する', async () => {
		const { getByText } = await render(<HomeScreen />)

		expect(getByText('ホームヘッダー')).toBeTruthy()
		expect(getByText('ヒーローバナー')).toBeTruthy()
		expect(getByText('ゲーム一覧')).toBeTruthy()
		expect(getByText('ゲームグリッド')).toBeTruthy()
		expect(getByText('デザインギャラリー')).toBeTruthy()
	})
})
