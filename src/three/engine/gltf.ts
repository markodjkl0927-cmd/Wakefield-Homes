import { Box3, Mesh, Vector3, type Material, type Object3D, type Texture } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import dracoWrapperUrl from 'three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js?url'
import dracoWasmUrl from 'three/examples/jsm/libs/draco/gltf/draco_decoder.wasm?url'

/**
 * Loads a staff-uploaded .glb (object URL from IndexedDB). This module is imported on demand, so
 * the glTF / Draco code only downloads when a home actually has a custom model. Decoders are
 * bundled with the app (no CDN).
 */
let draco: DRACOLoader | null = null

export async function loadModel(url: string): Promise<{ object: Object3D; bounds: Box3 }> {
  const loader = new GLTFLoader()
  if (!draco) draco = new DRACOLoader().setDecoderPath({ js: dracoWrapperUrl, wasm: dracoWasmUrl })
  loader.setDRACOLoader(draco)
  loader.setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.loadAsync(url)
  const root = gltf.scene
  root.traverse((o) => {
    if ((o as Mesh).isMesh) {
      const m = o as Mesh
      m.castShadow = true
      m.receiveShadow = true
    }
  })
  // Centre on the plot, sit on the ground and scale to a plausible house size.
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root)
  const size = box.getSize(new Vector3())
  const maxH = Math.max(size.x, size.z)
  let scale = 1
  if (!(maxH > 4 && maxH < 80) || size.y > 40) scale = 16 / Math.max(1e-3, maxH, size.y)
  root.scale.multiplyScalar(scale)
  root.updateMatrixWorld(true)
  box.setFromObject(root)
  const centre = box.getCenter(new Vector3())
  root.position.x -= centre.x
  root.position.z -= centre.z
  root.position.y -= box.min.y
  root.updateMatrixWorld(true)
  return { object: root, bounds: new Box3().setFromObject(root) }
}

export function disposeObject(root: Object3D) {
  const textures = new Set<Texture>()
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    m.geometry?.dispose()
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as Material[]
    for (const mat of mats) {
      if (!mat) continue
      for (const v of Object.values(mat)) if (v && (v as Texture).isTexture) textures.add(v as Texture)
      mat.dispose()
    }
  })
  textures.forEach((t) => t.dispose())
}
