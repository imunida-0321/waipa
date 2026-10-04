// プラットフォーム別の react-three-fiber エントリ。
// native は expo-gl ベースの /native、web は DOM Canvas 版（r3f.web.ts）を Metro が自動解決する
export { Canvas, useFrame, useThree } from '@react-three/fiber/native'
