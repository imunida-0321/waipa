import { act, fireEvent, render } from '@testing-library/react-native'
import { useTopics, type Topic } from '@/lib/topics-store'
import { CALIBRATION_MS, MEASURE_MS, METER_INTERVAL_MS } from '../engine'
import { SasayakiLimitGame } from '../sasayaki-limit-game'
import * as whisperTopics from '../topics'
import { defaultRng } from '@/lib/random'

jest.mock('react-native-reanimated', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return {
		__esModule: true,
		default: { View },
		useSharedValue: jest.fn((initial: number) => ({ value: initial })),
		useAnimatedStyle: jest.fn(() => ({})),
		withTiming: jest.fn((toValue: number) => toValue),
	}
})
jest.mock('@/lib/players-store', () => ({
	usePlayers: jest.fn(() => ({ count: 2, names: ['あか', 'あお'], history: [] })),
	getDisplayNames: jest.fn(() => ['あか', 'あお']),
}))
jest.mock('@/lib/topics-store', () => ({
	useTopics: jest.fn(() => ({ topics: [], fetchedAt: null })),
}))

const mockRequestPermission = jest.fn(async () => true)
const mockStart = jest.fn(async () => {})
const mockStop = jest.fn(async () => {})
let mockMic = {
	permission: 'pending' as string,
	requestPermission: mockRequestPermission,
	start: mockStart,
	stop: mockStop,
	levelDb: -30,
	isRecording: false,
	meteringSupported: true as boolean | null,
}
jest.mock('../use-mic-level', () => ({
	useMicLevel: jest.fn(() => mockMic),
}))

beforeEach(() => {
	jest.useFakeTimers()
	jest.clearAllMocks()
	jest.mocked(useTopics).mockReturnValue({ topics: [], fetchedAt: null })
	mockMic = {
		permission: 'granted',
		requestPermission: mockRequestPermission,
		start: mockStart,
		stop: mockStop,
		levelDb: -30,
		isRecording: false,
		meteringSupported: true,
	}
})

afterEach(() => {
	jest.useRealTimers()
	jest.restoreAllMocks()
})

async function completeSpeech(utils: Awaited<ReturnType<typeof render>>, levelDb: number) {
	mockMic = { ...mockMic, levelDb }
	await act(async () => {
		fireEvent.press(utils.getByText('タップして発声スタート'))
	})
	await act(async () => {
		jest.advanceTimersByTime(MEASURE_MS + 200)
	})
	await act(async () => {
		fireEvent.press(utils.getByText('つぎの人へ'))
	})
}

type TrialStoreModule = {
	useTrialRoundConsumer: (gameId: string, isRoundEnd: boolean) => void
}

function spyTrialRoundConsumer() {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const module = require('@/lib/trial-store') as TrialStoreModule
	return jest.spyOn(module, 'useTrialRoundConsumer').mockImplementation(() => {})
}

describe('SasayakiLimitGame', () => {
	it('権限拒否で案内画面が出る', async () => {
		mockMic = { ...mockMic, permission: 'denied' }
		const { getByText } = await render(<SasayakiLimitGame />)
		expect(getByText(/マイクの許可が必要/)).toBeTruthy()
	})
	it('metering 非対応端末はガード表示', async () => {
		mockMic = { ...mockMic, meteringSupported: false }
		const { getByText } = await render(<SasayakiLimitGame />)
		expect(getByText(/この端末ではマイクを利用できません/)).toBeTruthy()
	})
	it('metering 非対応端末ではマイクを回さない', async () => {
		mockMic = { ...mockMic, meteringSupported: false }
		const { getByText } = await render(<SasayakiLimitGame />)
		expect(getByText(/この端末ではマイクを利用できません/)).toBeTruthy()
		expect(mockStart).not.toHaveBeenCalled()
	})
	it('キャリブレーション → speech → 3秒計測 → 判定まで流れる', async () => {
		const { getByText } = await render(<SasayakiLimitGame />)
		// キャリブレーション（3秒）
		await act(async () => {
			jest.advanceTimersByTime(3100)
		})
		await act(async () => {
			fireEvent.press(getByText('スタート'))
		})
		// speech: 1人目のお題とスタートボタン
		expect(getByText('あか')).toBeTruthy()
		await act(async () => {
			fireEvent.press(getByText('タップして発声スタート'))
		})
		// measuring: 3秒経過で判定へ
		await act(async () => {
			jest.advanceTimersByTime(MEASURE_MS + 200)
		})
		expect(getByText('つぎの人へ')).toBeTruthy()
	})

	it('決着画面到達でトライアルの1ラウンドを消費する', async () => {
		const consumerSpy = spyTrialRoundConsumer()
		jest.spyOn(Math, 'random').mockReturnValue(0)
		const utils = await render(<SasayakiLimitGame />)
		await act(async () => {
			jest.advanceTimersByTime(3100)
		})
		await act(async () => {
			fireEvent.press(utils.getByText('スタート'))
		})

		for (let round = 1; round <= 3; round++) {
			await completeSpeech(utils, -30)
			await completeSpeech(utils, -2)
			if (round < 3) {
				await act(async () => {
					fireEvent.press(utils.getByText(`ラウンド ${round + 1} へ`))
				})
			}
		}

		expect(utils.getByText('結果発表')).toBeTruthy()
		expect(consumerSpy).toHaveBeenCalledWith('sasayaki-limit', true)
	})
})

describe('権限・録音・出題 effect の実行回数', () => {
	it('権限要求中の再レンダーでは再要求せず、許可後も音量更新で再要求しない', async () => {
		let resolvePermission!: (granted: boolean) => void
		mockRequestPermission.mockImplementationOnce(
			() =>
				new Promise<boolean>((resolve) => {
					resolvePermission = resolve
				}),
		)
		mockMic = { ...mockMic, permission: 'pending' }
		const { rerender, getByText } = await render(<SasayakiLimitGame />)
		expect(mockRequestPermission).toHaveBeenCalledTimes(1)
		expect(mockStart).not.toHaveBeenCalled()
		mockMic = { ...mockMic, levelDb: -40 }
		await rerender(<SasayakiLimitGame />)
		expect(mockRequestPermission).toHaveBeenCalledTimes(1)
		await act(async () => {
			resolvePermission(true)
		})
		expect(getByText('🎤 まわりの音をはかっています')).toBeTruthy()
		mockMic = { ...mockMic, permission: 'granted', levelDb: -20 }
		await rerender(<SasayakiLimitGame />)
		expect(mockRequestPermission).toHaveBeenCalledTimes(1)
		expect(mockStart).toHaveBeenCalledTimes(1)
	})

	it('拒否中は再レンダーしても要求せず、permission が許可に変わると1回要求する', async () => {
		mockMic = { ...mockMic, permission: 'denied' }
		const { rerender } = await render(<SasayakiLimitGame />)
		mockMic = { ...mockMic, levelDb: -40 }
		await rerender(<SasayakiLimitGame />)
		expect(mockRequestPermission).not.toHaveBeenCalled()
		expect(mockStart).not.toHaveBeenCalled()
		mockMic = { ...mockMic, permission: 'granted' }
		await rerender(<SasayakiLimitGame />)
		expect(mockRequestPermission).toHaveBeenCalledTimes(1)
		expect(mockStart).toHaveBeenCalledTimes(1)
	})

	it('録音はキャリブレーションと各計測で1回ずつ開始・停止し、音量更新では再起動しない', async () => {
		const utils = await render(<SasayakiLimitGame />)
		expect(mockStart).toHaveBeenCalledTimes(1)
		expect(mockStop).not.toHaveBeenCalled()
		mockMic = { ...mockMic, levelDb: -40, isRecording: true }
		await utils.rerender(<SasayakiLimitGame />)
		await act(async () => jest.advanceTimersByTime(CALIBRATION_MS))
		expect(mockStart).toHaveBeenCalledTimes(1)
		expect(mockStop).not.toHaveBeenCalled()
		await act(async () => fireEvent.press(utils.getByText('スタート')))
		expect(mockStop).toHaveBeenCalledTimes(1)
		await act(async () => fireEvent.press(utils.getByText('タップして発声スタート')))
		expect(mockStart).toHaveBeenCalledTimes(2)
		mockMic = { ...mockMic, levelDb: -20 }
		await utils.rerender(<SasayakiLimitGame />)
		await act(async () => jest.advanceTimersByTime(METER_INTERVAL_MS))
		expect(mockStart).toHaveBeenCalledTimes(2)
		expect(mockStop).toHaveBeenCalledTimes(1)
		await act(async () => jest.advanceTimersByTime(MEASURE_MS - METER_INTERVAL_MS))
		expect(mockStop).toHaveBeenCalledTimes(2)
		await act(async () => fireEvent.press(utils.getByText('つぎの人へ')))
		expect(mockStart).toHaveBeenCalledTimes(2)
		await act(async () => fireEvent.press(utils.getByText('タップして発声スタート')))
		expect(mockStart).toHaveBeenCalledTimes(3)
		await utils.unmount()
		expect(mockStop).toHaveBeenCalledTimes(3)
		await act(async () => jest.advanceTimersByTime(MEASURE_MS * 2))
		expect(mockStart).toHaveBeenCalledTimes(3)
		expect(mockStop).toHaveBeenCalledTimes(3)
		expect(mockRequestPermission).toHaveBeenCalledTimes(1)
	})

	it('キャリブレーション中のアンマウントで録音を1回停止する', async () => {
		const { unmount } = await render(<SasayakiLimitGame />)
		await unmount()
		expect(mockStart).toHaveBeenCalledTimes(1)
		expect(mockStop).toHaveBeenCalledTimes(1)
	})

	it('録音中に metering 非対応へ変化すると1回停止し、再レンダーで停止を繰り返さない', async () => {
		const { rerender, unmount } = await render(<SasayakiLimitGame />)
		mockMic = { ...mockMic, meteringSupported: false }
		await rerender(<SasayakiLimitGame />)
		await rerender(<SasayakiLimitGame />)
		await unmount()
		expect(mockStart).toHaveBeenCalledTimes(1)
		expect(mockStop).toHaveBeenCalledTimes(1)
	})

	it('各手番・ラウンド・再戦の speech でだけ1問引き、更新されたお題一覧は次の手番で使う', async () => {
		jest.spyOn(Math, 'random').mockReturnValue(0)
		const pick = jest.spyOn(whisperTopics, 'pickWhisperTopic')
		const initialTopics: Topic[] = [{ id: 'initial', pack: 'whisper', text: '最初のお題' }]
		const nextTopics: Topic[] = Array.from({ length: 8 }, (_, i) => ({
			id: `next-${i}`,
			pack: 'whisper',
			text: `次のお題${i}`,
		}))
		jest.mocked(useTopics).mockReturnValue({ topics: initialTopics, fetchedAt: null })
		const utils = await render(<SasayakiLimitGame />)
		expect(pick).not.toHaveBeenCalled()
		await act(async () => jest.advanceTimersByTime(CALIBRATION_MS))
		await act(async () => fireEvent.press(utils.getByText('スタート')))
		expect(pick).toHaveBeenCalledTimes(1)
		expect(pick).toHaveBeenNthCalledWith(1, initialTopics, [], defaultRng)
		expect(utils.getByText('「最初のお題」')).toBeTruthy()
		jest.mocked(useTopics).mockReturnValue({ topics: nextTopics, fetchedAt: null })
		mockMic = { ...mockMic, levelDb: -40 }
		await utils.rerender(<SasayakiLimitGame />)
		expect(pick).toHaveBeenCalledTimes(1)
		expect(utils.getByText('「最初のお題」')).toBeTruthy()
		for (let round = 1; round <= 3; round++) {
			await completeSpeech(utils, -30)
			expect(pick).toHaveBeenCalledTimes(round * 2)
			await completeSpeech(utils, -2)
			expect(pick).toHaveBeenCalledTimes(round * 2)
			if (round < 3) {
				await act(async () => fireEvent.press(utils.getByText(`ラウンド ${round + 1} へ`)))
				expect(pick).toHaveBeenCalledTimes(round * 2 + 1)
			}
		}
		expect(utils.getByText('結果発表')).toBeTruthy()
		await act(async () => fireEvent.press(utils.getByText('もう一回あそぶ')))
		expect(pick).toHaveBeenCalledTimes(7)
		// 現状は再戦しても使用済み ID を保持する。
		for (let call = 2; call <= 7; call++) {
			expect(pick).toHaveBeenNthCalledWith(
				call,
				nextTopics,
				['initial', ...nextTopics.slice(0, call - 2).map(({ id }) => id)],
				defaultRng,
			)
		}
		expect(utils.getByText('「次のお題5」')).toBeTruthy()
	})
})
