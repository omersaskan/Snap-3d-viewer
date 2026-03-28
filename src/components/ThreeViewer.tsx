import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// @ts-ignore
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
// @ts-ignore
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment'
// @ts-ignore
import { USDZLoader } from 'three/examples/jsm/loaders/USDZLoader'

interface ThreeViewerProps {
  modelUrl: string | null
  modelName: string | null
  onSceneReady?: (scene: THREE.Scene) => void
  exposure?: number
  shadows?: boolean
  envIntensity?: number
  bgColor?: string
  autoRotate?: boolean
  wireframe?: boolean
}

const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

export const ThreeViewer = ({ 
  modelUrl, 
  modelName,
  onSceneReady, 
  exposure = 1.0, 
  shadows = true,
  envIntensity = 1.0,
  bgColor = '#080808',
  autoRotate = false,
  wireframe = false
}: ThreeViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const mainLightRef = useRef<THREE.DirectionalLight | null>(null)
  const [progress, setProgress] = useState(0)

  // Update Scene Settings in real-time
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = exposure
      rendererRef.current.shadowMap.enabled = shadows
    }
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgColor)
      // Standard Three.js way to handle environment intensity if scene support is modern
      // @ts-ignore - scene.environmentIntensity is available in newer Three.js
      if (sceneRef.current.environmentIntensity !== undefined) {
        // @ts-ignore
        sceneRef.current.environmentIntensity = envIntensity
      }
    }
    if (mainLightRef.current) {
      mainLightRef.current.castShadow = shadows
    }
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
    }

    // Material Traversal for Wireframe and EnvMapIntensity fallback
    if (sceneRef.current) {
      const model = sceneRef.current.getObjectByName('exported-model')
      if (model) {
        model.traverse((child: any) => {
          if (child.isMesh && child.material) {
            child.material.wireframe = wireframe
            // Fallback for older Three.js versions without scene.environmentIntensity
            // @ts-ignore
            if (sceneRef.current.environmentIntensity === undefined) {
              child.material.envMapIntensity = envIntensity
            }
          }
        })
      }
    }
  }, [exposure, shadows, envIntensity, bgColor, autoRotate, wireframe])

  useEffect(() => {
    if (!containerRef.current) return

    // Scene Setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#080808')
    sceneRef.current = scene

    // Camera Setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 8)
    cameraRef.current = camera

    // Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2)) // Optimized for performance
    
    // Standard PBR Settings
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = exposure
    
    renderer.shadowMap.enabled = shadows
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Environment Setup (RoomEnvironment is standard for neutral studio look)
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture
    pmremGenerator.dispose()

    // Initial Placeholder (Neutral Sphere)
    const placeholder = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshStandardMaterial({ color: '#fff', metalness: 0.1, roughness: 0.5 })
    )
    placeholder.name = 'placeholder-box'
    scene.add(placeholder)

    // Controls Setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI / 1.75
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 2.0
    controlsRef.current = controls

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
    scene.add(hemiLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight.position.set(5, 5, 5)
    directionalLight.castShadow = shadows
    scene.add(directionalLight)
    mainLightRef.current = directionalLight

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8)
    fillLight.position.set(-5, 0, -5)
    scene.add(fillLight)

    // Render Loop
    let animationFrameId: number
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize Handling with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          const width = entry.contentRect.width
          const height = entry.contentRect.height
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height)
        }
      }
    })
    resizeObserver.observe(containerRef.current)

    if (onSceneReady) onSceneReady(scene)

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Model Loading Layer
  useEffect(() => {
    console.log('ThreeViewer: modelUrl changed:', modelUrl)
    
    if (!sceneRef.current) return

    // Clear previous model
    const previousModel = sceneRef.current.getObjectByName('exported-model')
    if (previousModel) {
      sceneRef.current.remove(previousModel)
    }

    if (!modelUrl) {
      // Show placeholder again if no model
      const placeholder = sceneRef.current.getObjectByName('placeholder-box')
      if (!placeholder) {
        const newPlaceholder = new THREE.Mesh(
          new THREE.SphereGeometry(1, 32, 32),
          new THREE.MeshStandardMaterial({ color: '#fff', metalness: 0.1, roughness: 0.5 })
        )
        newPlaceholder.name = 'placeholder-box'
        sceneRef.current.add(newPlaceholder)
      } else {
        placeholder.visible = true
      }
      setProgress(0)
      return
    }

    // Hide placeholder when loading a model
    const placeholder = sceneRef.current.getObjectByName('placeholder-box')
    if (placeholder) {
      sceneRef.current.remove(placeholder)
    }

    const isUSDZ = modelName?.toLowerCase().endsWith('.usdz') || modelName?.toLowerCase().endsWith('.zip')
    const loader = isUSDZ ? new USDZLoader() : new GLTFLoader()
    
    if (!isUSDZ) {
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath(DRACO_URL)
      ;(loader as GLTFLoader).setDRACOLoader(dracoLoader)
    }

    setProgress(0)
    
    const onLoad = (result: any) => {
      console.log('Model loaded successfully:', modelName)
      const model = isUSDZ ? result : result.scene
      model.name = 'exported-model'
      
      // Compute bounding box
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      
      // Auto-scale model to fit
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const scale = 5 / maxDim
      model.scale.multiplyScalar(scale)
      
      // Center the model after scaling
      model.position.sub(center.multiplyScalar(scale))
      
      sceneRef.current?.add(model)
      
      // Initial Material traversal for quality settings
      model.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = wireframe
          // Fallback for environment intensity
          // @ts-ignore
          if (sceneRef.current?.environmentIntensity === undefined) {
            child.material.envMapIntensity = envIntensity
          }
        }
      })

      console.log('Model added to scene. Format:', isUSDZ ? 'USDZ' : 'GLTF', 'Scale:', scale)
      setProgress(100)
    }

    const onProgress = (xhr: ProgressEvent) => {
      if (xhr.total > 0) {
        setProgress((xhr.loaded / xhr.total) * 100)
      }
    }

    const onError = (error: any) => {
      console.error('Error loading model:', error)
      setProgress(0)
    }

    loader.load(modelUrl, onLoad, onProgress, onError)

    return () => {
      if (!isUSDZ) {
        // @ts-ignore
        loader.dracoLoader?.dispose()
      }
    }
  }, [modelUrl])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {progress > 0 && progress < 100 && (
        <div className="loader-container" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100 }}>
          <div className="loader-bar-bg">
            <div className="loader-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{Math.round(progress)}%</p>
        </div>
      )}
    </div>
  )
}
