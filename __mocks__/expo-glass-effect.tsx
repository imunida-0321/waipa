import { View, type ViewProps } from 'react-native'

// Jest には Liquid Glass のネイティブ実装がない。View に差し替え、
// isLiquidGlassAvailable=false（フォールバック分岐）を既定にする
export function GlassView({ children, ...props }: ViewProps) {
	return <View {...props}>{children}</View>
}

export function isLiquidGlassAvailable(): boolean {
	return false
}
