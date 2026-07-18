import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAudioPlayer } from 'expo-audio'
import { settingsStore } from '../settings-store'
import { playSound, registerSound } from '../sound'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-audio', () => ({
	createAudioPlayer: jest.fn(),
}))

const createAudioPlayerMock = createAudioPlayer as jest.MockedFunction<typeof createAudioPlayer>

function createPlayer() {
	return {
		seekTo: jest.fn(),
		play: jest.fn(),
	} as unknown as ReturnType<typeof createAudioPlayer>
}

describe('sound', () => {
	beforeEach(async () => {
		jest.clearAllMocks()
		await AsyncStorage.clear()
		await settingsStore.hydrate()
		await settingsStore.setSoundEnabled(true)
	})

	it('registerSound は音源ごとに AudioPlayer を作成する', () => {
		const player = createPlayer()
		createAudioPlayerMock.mockReturnValueOnce(player)

		registerSound('sound-register', 101)

		expect(createAudioPlayer).toHaveBeenCalledWith(101)
	})

	it('registerSound は同じ名前の音源を二重登録しない', () => {
		createAudioPlayerMock.mockReturnValue(createPlayer())

		registerSound('sound-duplicate', 201)
		registerSound('sound-duplicate', 202)

		expect(createAudioPlayer).toHaveBeenCalledTimes(1)
		expect(createAudioPlayer).toHaveBeenCalledWith(201)
	})

	it('設定 ON で登録済み音源を先頭へ戻して再生する', () => {
		const player = createPlayer()
		createAudioPlayerMock.mockReturnValueOnce(player)
		registerSound('sound-play', 301)

		playSound('sound-play')

		expect(player.seekTo).toHaveBeenCalledWith(0)
		expect(player.play).toHaveBeenCalledTimes(1)
	})

	it('設定 OFF では登録済み音源も再生しない', async () => {
		const player = createPlayer()
		createAudioPlayerMock.mockReturnValueOnce(player)
		registerSound('sound-muted', 401)
		await settingsStore.setSoundEnabled(false)

		playSound('sound-muted')

		expect(player.seekTo).not.toHaveBeenCalled()
		expect(player.play).not.toHaveBeenCalled()
	})

	it('未登録の音源名は何もせず終了する', () => {
		expect(() => playSound('sound-missing')).not.toThrow()
		expect(createAudioPlayer).not.toHaveBeenCalled()
	})
})
