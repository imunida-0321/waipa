import * as ReactNative from 'react-native'
import { useColorScheme } from '../use-color-scheme'

describe('useColorScheme', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('react-native の useColorScheme をそのまま再公開する', () => {
		const useRNColorSchemeSpy = jest
			.spyOn(ReactNative, 'useColorScheme')
			.mockReturnValue('dark')

		expect(useColorScheme()).toBe('dark')
		expect(useRNColorSchemeSpy).toHaveBeenCalledTimes(1)
	})
})
