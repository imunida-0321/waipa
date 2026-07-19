// react-native-google-mobile-ads はネイティブ専用モジュールのため、
// プロダクションコードからの直接 import は @/lib/gma ラッパー (gma.ts / gma.web.ts) に限定する。
// 直接 import が増えると web バンドルが再び壊れる (codegenNativeComponent エラー) ための回帰ガード
/// <reference types="node" />
import * as fs from 'node:fs'
import * as path from 'node:path'

const SRC_DIR = path.resolve(__dirname, '../..')

// ネイティブ専用モジュール → 直接 import を許可するラッパーファイル
const NATIVE_ONLY_MODULES: Array<[string, Set<string>]> = [
	['react-native-google-mobile-ads', new Set(['lib/gma.ts', 'lib/gma.web.ts'])],
	['expo-tracking-transparency', new Set(['lib/att.ts', 'lib/att.web.ts'])],
]

function listSourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			// テストは __mocks__ 経由で SDK を参照してよい (web バンドル対象外)
			if (entry.name === '__tests__' || entry.name === '__mocks__') return []
			return listSourceFiles(full)
		}
		if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
			return [full]
		}
		return []
	})
}

describe('ネイティブ専用モジュールの import 境界', () => {
	it.each(NATIVE_ONLY_MODULES)(
		'プロダクションコードで %s を直接 import するのはラッパーのみ',
		(moduleName, allowed) => {
			const importPattern = new RegExp(`from\\s+['"]${moduleName}['"]`)
			const offenders = listSourceFiles(SRC_DIR)
				.filter((file) => {
					const rel = path.relative(SRC_DIR, file)
					if (allowed.has(rel)) return false
					return importPattern.test(fs.readFileSync(file, 'utf8'))
				})
				.map((file) => path.relative(SRC_DIR, file))
			expect(offenders).toEqual([])
		},
	)
})
