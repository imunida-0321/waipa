import { act, fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import { StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { customPunishmentsStore } from '@/lib/custom-punishments-store'
import { SizeSelect } from '../size-select'
import { NS } from '../theme'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('@/lib/haptics', () => ({
	haptics: { tap: jest.fn(), heavy: jest.fn(), success: jest.fn() },
}))
jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

beforeEach(async () => {
	await AsyncStorage.clear()
	await customPunishmentsStore.hydrate()
	jest.clearAllMocks()
})

it('3サイズが表示され、選択してスタートすると onStart が呼ばれる', async () => {
	const onStart = jest.fn()
	const utils = await render(<SizeSelect onStart={onStart} />)
	expect(utils.getByText(/小 4×4/)).toBeTruthy()
	expect(utils.getByText(/中 4×5/)).toBeTruthy()
	expect(utils.getByText(/大 5×6/)).toBeTruthy()
	expect(utils.getByText(/7ペア/)).toBeTruthy()

	await act(async () => {
		fireEvent.press(utils.getByText(/中 4×5/))
	})
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(onStart).toHaveBeenCalledWith('medium')
})

it('未選択でもデフォルト（小）でスタートできる', async () => {
	const onStart = jest.fn()
	const utils = await render(<SizeSelect onStart={onStart} />)
	await act(async () => {
		fireEvent.press(utils.getByText('スタート'))
	})
	expect(onStart).toHaveBeenCalledWith('small')
})

it('カスタムお題の入口行が表示される', async () => {
	const utils = await render(<SizeSelect onStart={jest.fn()} />)
	expect(utils.getByTestId('icon-crown')).toBeTruthy()
	expect(utils.queryByText('👑')).toBeNull()
	expect(utils.getByText('カスタムお題')).toBeTruthy()
	expect(utils.getByText('自分たちの罰ゲームを追加')).toBeTruthy()
	expect(utils.getByText('0件 有効')).toBeTruthy()
})

it('カスタムお題入口をタップするとシートが開く', async () => {
	const utils = await render(<SizeSelect onStart={jest.fn()} />)
	await act(async () => {
		fireEvent.press(utils.getByText('カスタムお題'))
	})
	expect(utils.getByText('マイセット')).toBeTruthy()
	expect(utils.getByText('デッキに混ぜる')).toBeTruthy()
})

it('カスタムお題の有効件数を表示する', async () => {
	await customPunishmentsStore.addItem('normal', '通常1')
	await customPunishmentsStore.addItem('normal', '通常2')
	await customPunishmentsStore.addItem('special', '特大1')
	const utils = await render(<SizeSelect onStart={jest.fn()} />)
	expect(utils.getByText('3件 有効')).toBeTruthy()
})

it('カスタムお題がオフなら「オフ」と表示する', async () => {
	await customPunishmentsStore.addItem('normal', '通常1')
	await customPunishmentsStore.setEnabled(false)
	const utils = await render(<SizeSelect onStart={jest.fn()} />)
	expect(utils.getByText('オフ')).toBeTruthy()
})

describe('ガラス面', () => {
	it('カスタムお題入口とサイズ選択肢はガラス面で描画される', async () => {
		const utils = await render(<SizeSelect onStart={jest.fn()} />)

		expect(utils.getAllByTestId('glass-surface-pseudo').length).toBeGreaterThanOrEqual(2)
	})
})

it('ネイティブガラスでも選択中サイズの枠線が見える', async () => {
	// GlassSurface のネイティブ分岐は共通枠線を持たないため、
	// optionActive 側が borderWidth を持たないと iOS 26 で選択表示が消える（PR #126 レビュー指摘）。
	// フレッシュな registry で require しつつ、React だけ元のインスタンスに固定して
	// 既存レンダラとのフック不整合を防ぐ（RNTL はテスト内 require 不可のため）
	jest.resetModules()
	jest.doMock('react', () => React)
	jest.doMock('expo-glass-effect', () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { View } = require('react-native')
		return {
			GlassView: (props: object) => <View {...props} />,
			isLiquidGlassAvailable: () => true,
		}
	})
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { SizeSelect: NativeSizeSelect } = require('../size-select') as typeof import('../size-select')
	const { getAllByTestId } = await render(<NativeSizeSelect onStart={jest.fn()} />)
	const active = getAllByTestId('glass-surface-native')
		.map((node) => StyleSheet.flatten(node.props.style))
		.find((style) => style?.borderColor === NS.rose)
	expect(active).toBeTruthy()
	expect(active?.borderWidth).toBe(1)
	jest.dontMock('expo-glass-effect')
	jest.dontMock('react')
})
