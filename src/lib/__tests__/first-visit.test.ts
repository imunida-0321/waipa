import AsyncStorage from '@react-native-async-storage/async-storage'
import { hasSeenHowTo, markHowToSeen } from '../first-visit'

jest.mock('@react-native-async-storage/async-storage', () =>
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

beforeEach(async () => {
	await AsyncStorage.clear()
})

it('未閲覧なら false、markHowToSeen 後は true', async () => {
	expect(await hasSeenHowTo('bomb-2-16')).toBe(false)
	await markHowToSeen('bomb-2-16')
	expect(await hasSeenHowTo('bomb-2-16')).toBe(true)
	expect(await hasSeenHowTo('five-sec-stop')).toBe(false)
})

it('AsyncStorage.getItem の失敗時は throw せず false（初回扱い）', async () => {
	const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('read error'))
	await expect(hasSeenHowTo('bomb-2-16')).resolves.toBe(false)
	spy.mockRestore()
})

it('AsyncStorage.setItem の失敗時も markHowToSeen は throw しない', async () => {
	const spy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('write error'))
	await expect(markHowToSeen('bomb-2-16')).resolves.toBeUndefined()
	spy.mockRestore()
})
