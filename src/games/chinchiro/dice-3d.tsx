/* eslint-disable react/no-unknown-property -- react-three-fiber は three.js のプロパティを JSX 属性として使う */
import { useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { Canvas, useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import {
	DIE_HALF,
	DIE_SIZE,
	FACE_NORMALS,
	PIP_OFFSETS,
	RING_RADIUS,
	finalPose,
	shonbenPose,
	tumbleProgress,
	tumbleQuaternion,
	type DieFace,
	type Pose,
	type Vec3,
} from './dice-3d-math'
import { CHIN } from './theme'

export type Dice3DProps = {
	/** 表示する出目（3個）。rolling 中も最終姿勢の計算に使う */
	dice: [number, number, number]
	/** この投がションベンか（先頭の1個がリング外へ） */
	shonben: boolean
	/** true の間タンブルアニメ再生。false なら最終姿勢で静止表示 */
	rolling: boolean
	/** 投を識別する key。変わるたびにアニメをリスタート */
	rollId: number
	/** アニメ長 ms（既定 1200 = dice-roll の ROLL_DURATION_MS と同じ） */
	durationMs?: number
}

const CANVAS_HEIGHT = 260
const PIP_RED = '#C0392B'
const PIP_BLUE = '#1D3A8F'
const DIE_COLOR = '#FDFCF5'
const RING_COLOR = '#8A8264'
const REFLECTION_OPACITY = 0.22
const START_DELAY_MS = 80
const PIP_RADIUS = DIE_SIZE * 0.08
const PIP_ONE_RADIUS = DIE_SIZE * 0.16
const PIP_SPREAD = DIE_SIZE * 0.26
const PIP_LIFT = 0.002

// rollId をシードにした決定的疑似乱数。同じ投なら再レンダーでも散らばりが変わらない
function mulberry32(seed: number): () => number {
	let s = seed >>> 0
	return () => {
		s = (s + 0x6d2b79f5) >>> 0
		let t = s
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

type PipSpec = {
	key: string
	position: THREE.Vector3
	quaternion: THREE.Quaternion
	red: boolean
	radius: number
}

// 6面ぶんのピップ（円板）の配置を事前計算。circleGeometry は +Z 向きなので面法線へ回す
function buildPips(): PipSpec[] {
	const forward = new THREE.Vector3(0, 0, 1)
	const pips: PipSpec[] = []
	for (const value of [1, 2, 3, 4, 5, 6] as DieFace[]) {
		const normal = new THREE.Vector3(...FACE_NORMALS[value])
		const quaternion = new THREE.Quaternion().setFromUnitVectors(forward, normal)
		PIP_OFFSETS[value].forEach(([ox, oy], i) => {
			const position = new THREE.Vector3(
				ox * PIP_SPREAD,
				oy * PIP_SPREAD,
				DIE_HALF + PIP_LIFT,
			).applyQuaternion(quaternion)
			pips.push({
				key: `${value}-${i}`,
				position,
				quaternion,
				red: value === 1 || value === 4,
				radius: value === 1 ? PIP_ONE_RADIUS : PIP_RADIUS,
			})
		})
	}
	return pips
}

// 艶のある白キューブ＋ピップ。opacity<1 のときは床の映り込み用（反転コピー）
function DieMesh({ opacity = 1, renderOrder = 0 }: { opacity?: number; renderOrder?: number }) {
	const pips = useMemo(() => buildPips(), [])
	const transparent = opacity < 1
	const side = transparent ? THREE.DoubleSide : THREE.FrontSide
	return (
		<group>
			<mesh renderOrder={renderOrder}>
				<boxGeometry args={[DIE_SIZE, DIE_SIZE, DIE_SIZE, 3, 3, 3]} />
				<meshStandardMaterial
					color={DIE_COLOR}
					roughness={0.15}
					metalness={0.05}
					transparent={transparent}
					opacity={opacity}
					depthWrite={!transparent}
					side={side}
				/>
			</mesh>
			{pips.map((pip) => (
				<mesh
					key={pip.key}
					position={pip.position}
					quaternion={pip.quaternion}
					renderOrder={transparent ? renderOrder + 1 : renderOrder}
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
			))}
		</group>
	)
}

type DieAnim = {
	pose: Pose
	axis: Vec3
	totalAngle: number
	start: Vec3
	delayMs: number
}

function DiceScene({ dice, shonben, rolling, rollId, durationMs }: Required<Dice3DProps>) {
	const mainRefs = useRef<(THREE.Group | null)[]>([])
	const reflectionRefs = useRef<(THREE.Group | null)[]>([])
	const startRef = useRef<{ rollId: number; t0: number } | null>(null)

	// 投ごとの最終姿勢・タンブル軸・投入開始位置。rollId シードで決定的
	const anims = useMemo<DieAnim[]>(() => {
		const rng = mulberry32(rollId)
		return dice.map((value, index) => {
			const escaped = shonben && index === 0
			const pose = escaped ? shonbenPose(index, rng) : finalPose(value as DieFace, index, rng)
			const axis: Vec3 = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1]
			const totalAngle = (2 + rng()) * Math.PI * 2
			const start: Vec3 = [
				(index - 1) * 0.9 + (rng() - 0.5) * 0.5,
				2.3 + rng() * 0.6,
				2.2 + (escaped ? 0.4 : 0),
			]
			return { pose, axis, totalAngle, start, delayMs: index * START_DELAY_MS }
		})
	}, [dice, shonben, rollId])

	useFrame(({ clock }) => {
		const nowMs = clock.getElapsedTime() * 1000
		if (rolling && startRef.current?.rollId !== rollId) {
			startRef.current = { rollId, t0: nowMs }
		}
		anims.forEach((anim, i) => {
			let t = 1
			if (rolling && startRef.current) {
				const span = Math.max(durationMs - anim.delayMs, 1)
				t = Math.min(Math.max((nowMs - startRef.current.t0 - anim.delayMs) / span, 0), 1)
			}
			const { ease, bounceY } = tumbleProgress(t)
			const [qx, qy, qz, qw] = tumbleQuaternion(
				anim.pose.quaternion,
				anim.axis,
				anim.totalAngle,
				ease,
			)
			const [sx, sy, sz] = anim.start
			const [fx, fy, fz] = anim.pose.position
			const x = sx + (fx - sx) * ease
			const y = sy + (fy - sy) * ease + bounceY
			const z = sz + (fz - sz) * ease
			for (const ref of [mainRefs.current[i], reflectionRefs.current[i]]) {
				if (!ref) continue
				ref.position.set(x, y, z)
				ref.quaternion.set(qx, qy, qz, qw)
			}
		})
	})

	return (
		<>
			<ambientLight intensity={0.6} />
			<directionalLight position={[3, 6, 2]} intensity={1.4} />
			<directionalLight position={[-4, 3, -2]} intensity={0.35} />
			{/* 鏡面床（renderOrder 1 で先に描き、上に映り込みを重ねる） */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
				<planeGeometry args={[30, 30]} />
				<meshStandardMaterial
					color={CHIN.bg}
					roughness={0.3}
					metalness={0.4}
					transparent
					opacity={0.92}
					depthWrite={false}
				/>
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
						<DieMesh opacity={REFLECTION_OPACITY} renderOrder={2} />
					</group>
				))}
			</group>
			{/* 丼の縁を示す細いリング */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
				<torusGeometry args={[RING_RADIUS, 0.02, 12, 96]} />
				<meshStandardMaterial color={RING_COLOR} roughness={0.4} metalness={0.6} />
			</mesh>
			{/* 本体のサイコロ3個 */}
			{dice.map((_, i) => (
				<group
					key={i}
					ref={(el) => {
						mainRefs.current[i] = el
					}}
				>
					<DieMesh />
				</group>
			))}
		</>
	)
}

// 斜め上からの俯瞰カメラで、鏡面床の丼リングにサイコロが投げ込まれる3D演出
export function Dice3D({ dice, shonben, rolling, rollId, durationMs = 1200 }: Dice3DProps) {
	return (
		<View style={styles.wrap} testID="dice-3d">
			<Canvas
				camera={{ position: [0, 5.2, 3.4], fov: 40 }}
				onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
			>
				<color attach="background" args={[CHIN.bg]} />
				<DiceScene
					dice={dice}
					shonben={shonben}
					rolling={rolling}
					rollId={rollId}
					durationMs={durationMs}
				/>
			</Canvas>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
		height: CANVAS_HEIGHT,
	},
})
