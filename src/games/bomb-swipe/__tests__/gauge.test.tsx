import { fireEvent, render } from '@testing-library/react-native'
import { SwipeGauge } from '../gauge'

jest.mock('expo-linear-gradient', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { View } = require('react-native')
	return { LinearGradient: View }
})

// このプロジェクトの @testing-library/react-native (v14) は fireEvent 自体が
// 内部で act() を await する非同期関数。await せず複数回連続で呼ぶと act() 呼び出しが
// 重複し、以降のテストの render() が空ツリーを返す状態異常が発生するため、
// 1 回ずつ必ず await する（brief の一括 act(async () => {...}) 版は本環境では動作しない）
async function layout(gauge: any) {
	await fireEvent(gauge, 'layout', {
		nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 400 } },
	})
}

it('初期表示はスコア 0', async () => {
	const { getByTestId, getByText } = await render(
		<SwipeGauge onScoreChange={() => {}} onRelease={() => {}} />,
	)
	await layout(getByTestId('swipe-gauge'))
	expect(getByText('0')).toBeTruthy()
})

it('上方向ドラッグでスコアが増え onScoreChange が呼ばれる', async () => {
	const onScoreChange = jest.fn()
	const { getByTestId, getByText } = await render(
		<SwipeGauge onScoreChange={onScoreChange} onRelease={() => {}} />,
	)
	const gauge = getByTestId('swipe-gauge')
	await layout(gauge)
	await fireEvent(gauge, 'responderGrant', { nativeEvent: { pageY: 500 } })
	await fireEvent(gauge, 'responderMove', { nativeEvent: { pageY: 300 } }) // 200px 上 = 50点
	expect(getByText('50')).toBeTruthy()
	expect(onScoreChange).toHaveBeenLastCalledWith(50)
})

it('指を離すと onRelease に最終スコアが渡る', async () => {
	const onRelease = jest.fn()
	const { getByTestId } = await render(
		<SwipeGauge onScoreChange={() => {}} onRelease={onRelease} />,
	)
	const gauge = getByTestId('swipe-gauge')
	await layout(gauge)
	await fireEvent(gauge, 'responderGrant', { nativeEvent: { pageY: 500 } })
	await fireEvent(gauge, 'responderMove', { nativeEvent: { pageY: 100 } }) // 400px 上 = 100点
	await fireEvent(gauge, 'responderRelease', { nativeEvent: { pageY: 100 } })
	expect(onRelease).toHaveBeenCalledWith(100)
})

it('タッチせず離しても 0 で確定できる（グラント直後リリース）', async () => {
	const onRelease = jest.fn()
	const { getByTestId } = await render(
		<SwipeGauge onScoreChange={() => {}} onRelease={onRelease} />,
	)
	const gauge = getByTestId('swipe-gauge')
	await layout(gauge)
	await fireEvent(gauge, 'responderGrant', { nativeEvent: { pageY: 500 } })
	await fireEvent(gauge, 'responderRelease', { nativeEvent: { pageY: 500 } })
	expect(onRelease).toHaveBeenCalledWith(0)
})
