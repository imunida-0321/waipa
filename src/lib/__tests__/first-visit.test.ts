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
