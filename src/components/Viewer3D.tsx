import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Html, Bvh, AdaptiveDpr, AdaptiveEvents, Center } from '@react-three/drei'
import { Suspense } from 'react'
import { Model } from './Model'
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'
import { ExportPanel } from './ExportPanel'

interface Viewer3DProps {
  modelUrl: string | null
  environmentPreset: "city" | "park" | "studio" | "warehouse" | "sunset"
  enableBloom: boolean
  enableSsao: boolean
}

export const Viewer3D = ({ 
  modelUrl, 
  environmentPreset = "city", 
  enableBloom, 
  enableSsao 
}: Viewer3DProps) => {
  return (
    <div style={{ width: '100%', height: '100%', background: '#050505' }}>
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 8], fov: 45 }} 
        gl={{ 
          preserveDrawingBuffer: true, 
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          alpha: true
        }}
        dpr={[1, 1.5]} // Capped for stability
        frameloop="demand"
      >
        <color attach="background" args={['#080808']} />
        
        <Suspense fallback={null}>
          <Bvh firstHitOnly>
            {/* Manual Optimized Lighting (Better than Stage) */}
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            <Center top>
              {modelUrl ? (
                <Model url={modelUrl} />
              ) : (
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
                </mesh>
              )}
            </Center>
            
            <Environment preset={environmentPreset} />
            
            <ContactShadows 
              opacity={0.4} 
              scale={15} 
              blur={2} 
              far={1.5} 
              resolution={256} 
              color="#000000"
            />
          </Bvh>
        </Suspense>
        
        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 1.75} 
          enablePan={true}
          panSpeed={1}
          rotateSpeed={0.8}
        />
        
        <EffectComposer multisampling={0}>
          {enableBloom ? (
            <Bloom 
              luminanceThreshold={1.5} 
              mipmapBlur 
              intensity={0.3} 
              radius={0.3}
            />
          ) : <></>}
          {enableSsao ? (
            <SSAO 
              samples={8} // Lower samples = Much faster
              radius={4} 
              intensity={12} 
              luminanceInfluence={0.2} 
            />
          ) : <></>}
        </EffectComposer>

        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        {modelUrl && (
          <Html position={[0, -2, 0]} center transform={false} fullscreen>
            <div className="canvas-overlay" style={{ pointerEvents: 'none' }}>
              <div style={{ pointerEvents: 'auto' }}>
                <ExportPanel />
              </div>
            </div>
          </Html>
        )}
      </Canvas>
    </div>
  )
}
