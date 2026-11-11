// jest の設定。package.json の "jest" から移した。
// テストでも、Metro のビルドと同じく React Compiler を通す（app.json の experiments.reactCompiler）。
// 通さないと、Compiler が原因で本番でだけ起きる不具合をテストで拾えない（issue #178）
const expoPreset = require('jest-expo/jest-preset')

const BABEL_PATTERN = '\\.[jt]sx?$'
// テストファイルは Compiler を通さない。jest.mock() のファクトリの中に書いたコンポーネントまで
// 変換されると、ファクトリの外の変数（Compiler のランタイム）を参照してエラーになる
const TEST_FILE_PATTERN = '(/__tests__/.*|\\.test)\\.[jt]sx?$'
const [babelJestPath, babelOptions] = expoPreset.transform[BABEL_PATTERN]

module.exports = {
	preset: 'jest-expo',
	// 上から順に、最初に一致したものが使われる
	transform: {
		[TEST_FILE_PATTERN]: [babelJestPath, babelOptions],
		[BABEL_PATTERN]: [
			babelJestPath,
			{
				...babelOptions,
				caller: { ...babelOptions.caller, supportsReactCompiler: true },
			},
		],
	},
	setupFiles: ['<rootDir>/jest.setup.js'],
	collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**', '!src/**/*.d.ts'],
	testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
	moduleNameMapper: {
		'^@/assets/(.*)$': '<rootDir>/assets/$1',
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	transformIgnorePatterns: [
		'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?(-.*)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|expo-router|expo-modules-core|react-native-reanimated|react-native-worklets)/)',
	],
}
