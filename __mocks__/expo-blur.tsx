import { View, type ViewProps } from 'react-native'

type Props = ViewProps & {
	tint?: string
	intensity?: number
	experimentalBlurMethod?: string
}

// View が知らない props を渡すと警告になるため、blur 固有 props は落とす
export function BlurView({ children, tint: _tint, intensity: _intensity, experimentalBlurMethod: _m, ...props }: Props) {
	return <View {...props}>{children}</View>
}
