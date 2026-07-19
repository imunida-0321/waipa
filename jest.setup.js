// use-shake.ts などが実 expo-sensors → expo 本体（Expo.fx.tsx の副作用チェーン）を
// 読み込むと、jest-expo 内部モックの解決ずれ次第でスイートがロード時に落ちる（#111）。
// ユニットテストは実センサーに依存しないため、グローバルにスタブへ差し替える。
// 個別テスト（use-shake.test.ts 等）の jest.mock はこちらより優先される。
// AsyncStorage はネイティブ実装がテスト環境に存在しないため、公式 jest モックへ
// グローバル差し替え（settings-store 経由で間接 import する画面テストの共通対策）。
// 個別テストの jest.mock はこちらより優先される
jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('expo-sensors', () => ({
	Accelerometer: {
		isAvailableAsync: jest.fn(async () => false),
		setUpdateInterval: jest.fn(),
		addListener: jest.fn(() => ({ remove: jest.fn() })),
	},
}))
