/* eslint-disable react/no-unknown-property -- react-three-fiber は three.js のプロパティを JSX 属性として使う */
import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { Canvas, useFrame, useThree } from './r3f'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
	DIE_SIZE,
	RING_RADIUS,
	buildPips,
	mulberry32,
	finalPose,
	shonbenPose,
	tumbleProgress,
	type DieFace,
	type Pose,
	type Vec3,
} from './math'

export type DiceCanvasProps = {
	/** 表示する出目。rolling 中も最終姿勢の計算に使う */
	dice: readonly number[]
	rolling: boolean
	rollId: number
	backgroundColor: string
	testID: string
	/** 先頭の1個をリング外へ転がす（既定 false） */
	shonben?: boolean
	/** 省略時は丼リングを表示しない */
	ringColor?: string
	/** アニメ長 ms（既定 1200） */
	durationMs?: number
	/** Canvas の高さ（既定 260） */
	height?: number
}

const PIP_RED = '#C0392B'
const PIP_BLUE = '#1D3A8F'
const DIE_COLOR = '#FAFAF8'
// ピップの疑似インセット用リム色（面色を約25%暗くしたクリームグレー）
const PIP_RIM = '#D9D5CB'
const REFLECTION_OPACITY = 0.22
const START_DELAY_MS = 80
const DIE_ENV_INTENSITY = 0.6

// useFrame のホットパスで使い回すテンポラリ（毎フレームの new を避ける）
const _remainder = new THREE.Quaternion()
const _quat = new THREE.Quaternion()

// 角丸キューブ（physical 材質）＋二重円ピップ。opacity<1 のときは床の映り込み用（反転コピー）
function DieMesh({
	geometry,
	opacity = 1,
	renderOrder = 0,
	castShadow = false,
}: {
	geometry: THREE.BufferGeometry
	opacity?: number
	renderOrder?: number
	castShadow?: boolean
}) {
	const pips = useMemo(() => buildPips(), [])
	const transparent = opacity < 1
	const side = transparent ? THREE.DoubleSide : THREE.FrontSide
	return (
		<group>
			<mesh geometry={geometry} renderOrder={renderOrder} castShadow={castShadow}>
				<meshPhysicalMaterial
					color={DIE_COLOR}
					roughness={0.35}
					clearcoat={1}
					clearcoatRoughness={0.15}
					envMapIntensity={DIE_ENV_INTENSITY}
					transparent={transparent}
					opacity={opacity}
					depthWrite={!transparent}
					side={side}
				/>
			</mesh>
			{pips.map((pip) => (
				<group key={pip.key}>
					{/* リム（下・面色を暗く） */}
					<mesh
						position={pip.rimPosition}
						quaternion={pip.quaternion}
						renderOrder={transparent ? renderOrder + 1 : renderOrder}
					>
						<circleGeometry args={[pip.rimRadius, 24]} />
						<meshStandardMaterial
							color={PIP_RIM}
							roughness={0.5}
							metalness={0}
							transparent={transparent}
							opacity={opacity}
							depthWrite={!transparent}
							side={side}
						/>
					</mesh>
					{/* ピップ本体（上） */}
					<mesh
						position={pip.position}
						quaternion={pip.quaternion}
						renderOrder={transparent ? renderOrder + 2 : renderOrder}
					>
						<circleGeometry args={[pip.radius, 24]} />
						<meshStandardMaterial
							color={pip.red ? PIP_RED : PIP_BLUE}
							roughness={0.35}
							metalness={0}
							transparent={transparent}
							opacity={opacity}
							depthWrite={!transparent}
							side={side}
						/>
					</mesh>
				</group>
			))}
		</group>
	)
}

type DieAnim = {
	finalPos: THREE.Vector3
	finalQuat: THREE.Quaternion
	axis: THREE.Vector3
	totalAngle: number
	start: THREE.Vector3
	delayMs: number
}

// RoomEnvironment を PMREM に焼いて scene.environment に設定（IBL）。マウント時に一度だけ生成・破棄
function useImageBasedLighting() {
	const gl = useThree((s) => s.gl)
	const scene = useThree((s) => s.scene)
	useEffect(() => {
		const pmrem = new THREE.PMREMGenerator(gl)
		const room = new RoomEnvironment()
		const envTexture = pmrem.fromScene(room, 0.04).texture
		// r3f では scene.environment への代入で IBL を適用するのが定石（three 側の可変フィールド）
		// eslint-disable-next-line react-hooks/immutability
		scene.environment = envTexture
		return () => {
			scene.environment = null
			envTexture.dispose()
			pmrem.dispose()
			room.dispose()
		}
	}, [gl, scene])
}

type DiceSceneProps = Required<
	Pick<
		DiceCanvasProps,
		'dice' | 'shonben' | 'rolling' | 'rollId' | 'durationMs' | 'backgroundColor'
	>
> &
	Pick<DiceCanvasProps, 'ringColor'>

function DiceScene({
	dice,
	shonben,
	rolling,
	rollId,
	durationMs,
	backgroundColor,
	ringColor,
}: DiceSceneProps) {
	const mainRefs = useRef<(THREE.Group | null)[]>([])
	const reflectionRefs = useRef<(THREE.Group | null)[]>([])
	const startRef = useRef<{ rollId: number; t0: number } | null>(null)
	// 最終姿勢を適用済みの rollId。静止中は毎フレームの再計算をスキップする
	const settledRef = useRef<number | null>(null)

	useImageBasedLighting()

	// 角丸ジオメトリはシーンで1つだけ生成して全ダイスで共有
	const geometry = useMemo(
		() => new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 4, DIE_SIZE * 0.12),
		[],
	)
	useEffect(() => () => geometry.dispose(), [geometry])

	// 投ごとの最終姿勢・タンブル軸・投入開始位置。rollId シードで決定的
	const anims = useMemo<DieAnim[]>(() => {
		const rng = mulberry32(rollId)
		return dice.map((value, index) => {
			const escaped = shonben && index === 0
			const pose: Pose = escaped
				? shonbenPose(index, rng)
				: finalPose(value as DieFace, index, rng)
			const rawAxis: Vec3 = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1]
			const axis = new THREE.Vector3(...rawAxis)
			if (axis.lengthSq() < 1e-12) axis.set(1, 0, 0)
			axis.normalize()
			const totalAngle = (2 + rng()) * Math.PI * 2
			const start = new THREE.Vector3(
				(index - (dice.length - 1) / 2) * 0.9 + (rng() - 0.5) * 0.5,
				2.3 + rng() * 0.6,
				2.2 + (escaped ? 0.4 : 0),
			)
			return {
				finalPos: new THREE.Vector3(...pose.position),
				finalQuat: new THREE.Quaternion(...pose.quaternion),
				axis,
				totalAngle,
				start,
				delayMs: index * START_DELAY_MS,
			}
		})
	}, [dice, shonben, rollId])

	useFrame(({ clock }) => {
		// 静止中: 最終姿勢を一度だけ適用してスキップ
		if (!rolling) {
			if (settledRef.current === rollId) return
			anims.forEach((anim, i) => {
				for (const ref of [mainRefs.current[i], reflectionRefs.current[i]]) {
					if (!ref) continue
					ref.position.copy(anim.finalPos)
					ref.quaternion.copy(anim.finalQuat)
				}
			})
			settledRef.current = rollId
			return
		}

		settledRef.current = null
		const nowMs = clock.getElapsedTime() * 1000
		if (startRef.current?.rollId !== rollId) {
			startRef.current = { rollId, t0: nowMs }
		}
		anims.forEach((anim, i) => {
			const span = Math.max(durationMs - anim.delayMs, 1)
			const t = Math.min(Math.max((nowMs - startRef.current!.t0 - anim.delayMs) / span, 0), 1)
			const { ease, bounceY } = tumbleProgress(t)
			// q(t) = final × R(axis, (1 - ease) × totalAngle)（テンポラリで無割り当て）
			_remainder.setFromAxisAngle(anim.axis, (1 - ease) * anim.totalAngle)
			_quat.copy(anim.finalQuat).multiply(_remainder)
			const x = anim.start.x + (anim.finalPos.x - anim.start.x) * ease
			const y = anim.start.y + (anim.finalPos.y - anim.start.y) * ease + bounceY
			const z = anim.start.z + (anim.finalPos.z - anim.start.z) * ease
			for (const ref of [mainRefs.current[i], reflectionRefs.current[i]]) {
				if (!ref) continue
				ref.position.set(x, y, z)
				ref.quaternion.copy(_quat)
			}
		})
	})

	return (
		<>
			<ambientLight intensity={0.35} />
			<directionalLight
				position={[3, 6, 2]}
				intensity={1.5}
				castShadow
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
				shadow-camera-near={1}
				shadow-camera-far={18}
				shadow-camera-left={-2.6}
				shadow-camera-right={2.6}
				shadow-camera-top={2.6}
				shadow-camera-bottom={-2.6}
				shadow-bias={-0.0005}
			/>
			<directionalLight position={[-4, 3, -2]} intensity={0.3} />
			{/* 鏡面床（renderOrder 1 で先に描き、上に映り込みを重ねる） */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
				<planeGeometry args={[30, 30]} />
				<meshStandardMaterial
					color={backgroundColor}
					roughness={0.95}
					metalness={0}
					transparent
					opacity={0.92}
					depthWrite={false}
				/>
			</mesh>
			{/* ソフトシャドウ受け（影だけを落とす透明プレーン） */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
				<planeGeometry args={[16, 16]} />
				<shadowMaterial transparent opacity={0.35} />
			</mesh>
			{/* 映り込み: サイコロ群を scale(1,-1,1) で床下に複製した反転コピー */}
			<group scale={[1, -1, 1]}>
				{dice.map((_, i) => (
					<group
						key={i}
						ref={(el) => {
							reflectionRefs.current[i] = el
						}}
					>
						<DieMesh geometry={geometry} opacity={REFLECTION_OPACITY} renderOrder={2} />
					</group>
				))}
			</group>
			{/* 丼の縁を示す細いリング */}
			{ringColor !== undefined && (
				<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
					<torusGeometry args={[RING_RADIUS, 0.02, 12, 96]} />
					<meshStandardMaterial color={ringColor} roughness={0.4} metalness={0.6} />
				</mesh>
			)}
			{/* 本体のサイコロ */}
			{dice.map((_, i) => (
				<group
					key={i}
					ref={(el) => {
						mainRefs.current[i] = el
					}}
				>
					<DieMesh geometry={geometry} castShadow />
				</group>
			))}
		</>
	)
}

// 斜め上からの俯瞰カメラで、鏡面床にサイコロが投げ込まれる3D演出
export function DiceCanvas({
	dice,
	shonben = false,
	rolling,
	rollId,
	durationMs = 1200,
	backgroundColor,
	ringColor,
	height = 260,
	testID,
}: DiceCanvasProps) {
	return (
		<View style={[styles.wrap, { height }]} testID={testID}>
			<Canvas
				shadows
				gl={{ toneMapping: THREE.ACESFilmicToneMapping }}
				camera={{ position: [0, 5.2, 3.4], fov: 40 }}
				onCreated={({ gl, camera }) => {
					// native は dpr プロップ非対応のため onCreated で解像度上限を指定（web/native 両対応）
					gl.setPixelRatio(Math.min(gl.getPixelRatio(), 2))
					camera.lookAt(0, 0, 0)
				}}
			>
				<color attach="background" args={[backgroundColor]} />
				<DiceScene
					dice={dice}
					shonben={shonben}
					rolling={rolling}
					rollId={rollId}
					durationMs={durationMs}
					backgroundColor={backgroundColor}
					ringColor={ringColor}
				/>
			</Canvas>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
	},
})
