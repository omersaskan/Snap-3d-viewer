import { useState, useCallback, useRef, useEffect } from 'react'
import { ThreeViewer } from './components/ThreeViewer'
import { ExportPanel } from './components/ExportPanel'
import { Upload, HelpCircle, Box, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ARView } from './components/ARView'
import * as THREE from 'three'
import './index.css'

const getProxiedUrl = (url: string | null) => {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url
  // Use AllOrigins as a CORS proxy for remote URLs
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
}

function App() {
  const [modelUrl, setModelUrl] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return getProxiedUrl(params.get('model'))
  })
  const [modelName, setModelName] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const modelParam = params.get('model')
    return modelParam ? (modelParam.split('/').pop()?.split('?')[0] || 'Model') : null
  })
  const [scene, setScene] = useState<THREE.Scene | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exposure, setExposure] = useState(1.0)
  const [shadows, setShadows] = useState(true)
  const [envIntensity, setEnvIntensity] = useState(1.0)
  const [bgColor, setBgColor] = useState('#111111')
  const [autoRotate, setAutoRotate] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [showAR, setShowAR] = useState(false)
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    console.log('File received in App:', file.name)
    const fileName = file.name.toLowerCase()
    const isSupported = fileName.endsWith('.glb') || 
                       fileName.endsWith('.gltf') || 
                       fileName.endsWith('.usdz') || 
                       fileName.endsWith('.zip')

    if (file && isSupported) {
      const url = URL.createObjectURL(file)
      console.log('Created blob URL:', url)
      setModelName(file.name)
      setModelUrl((prevUrl) => {
        if (prevUrl && prevUrl.startsWith('blob:')) {
          URL.revokeObjectURL(prevUrl)
        }
        return url
      })
    } else {
      console.warn('Invalid file type:', file?.name)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (modelUrl && modelUrl.startsWith('blob:')) {
        URL.revokeObjectURL(modelUrl)
      }
    }
  }, [modelUrl])

  const loadModelFromUrl = useCallback(async (url: string) => {
    setIsLoading(true)
    setError(null)
    console.log('Fetching model from:', url)

    try {
      // 1. Try fetching directly
      let response;
      try {
        response = await fetch(url)
      } catch (e) {
        console.warn('Direct fetch failed, trying proxy...', e)
        // 2. Try proxy fallback (AllOrigins)
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
        response = await fetch(proxyUrl)
      }

      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`)

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const fileName = url.split('/').pop()?.split('?')[0] || 'Model'
      
      setModelUrl(blobUrl)
      setModelName(fileName)
    } catch (err: unknown) {
      console.error('Error loading model from URL:', err)
      const message = err instanceof Error ? err.message : String(err)
      setError(`Model yüklenemedi: ${message}. Lütfen linkin geçerli ve erişilebilir olduğundan emin olun.`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadModelFromProductId = useCallback(async (productId: string) => {
    setIsLoading(true)
    setError(null)
    console.log('Fetching product details for:', productId)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !apiKey) {
        throw new Error('Supabase configuration is missing in environments.')
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}&select=*,jobs(*),targets(*)`, {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (!response.ok) throw new Error(`Failed to fetch product details: ${response.statusText}`)

      const products = await response.json()
      console.log('Fetched product data:', products[0])
      
      if (!products || products.length === 0) {
        throw new Error('İlgili ürün bulunamadı.')
      }

      const product = products[0]
      
      // Supabase can return joined tables as arrays or single objects depending on the relationship
      const job = Array.isArray(product.jobs) ? product.jobs[0] : product.jobs
      const target = Array.isArray(product.targets) ? product.targets[0] : product.targets
      
      const glbUrl = job?.assets?.modelUrls?.glbUrl || product.model_url
      const productTargetUrl = target?.target_url
      
      console.log('Extracted URLs:', { glbUrl, productTargetUrl })

      if (!glbUrl) {
        throw new Error('Model URL si (glbUrl) bulunamadı.')
      }

      setTargetUrl(productTargetUrl || null)
      await loadModelFromUrl(glbUrl)
    } catch (err: unknown) {
      console.error('Error loading product:', err)
      const message = err instanceof Error ? err.message : String(err)
      setError(`Ürün getirilemedi: ${message}`)
      setIsLoading(false)
    }
  }, [loadModelFromUrl])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const modelParam = params.get('model')
    const productIdParam = params.get('product_id')
    
    if (productIdParam) {
      loadModelFromProductId(productIdParam)
    } else if (modelParam) {
      loadModelFromUrl(modelParam)
    }
  }, [loadModelFromUrl, loadModelFromProductId])

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (urlInputValue.trim()) {
      loadModelFromUrl(urlInputValue)
      setUrlInputValue('')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    console.log('Drop event detected')
    const file = e.dataTransfer.files[0]
    if (file) {
      console.log('File from drop:', file.name)
      handleFile(file)
    }
  }, [handleFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input change detected')
    const file = e.target.files?.[0]
    if (file) {
      console.log('File from input:', file.name)
      handleFile(file)
    }
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleReset = () => {
    if (modelUrl && modelUrl.startsWith('blob:')) {
      URL.revokeObjectURL(modelUrl)
    }
    setModelUrl(null)
    setModelName(null)
  }

  return (
    <div 
      className="app-container" 
      onDrop={handleDrop} 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleInputChange} 
        accept=".glb,.gltf,.zip" 
        style={{ display: 'none' }} 
      />

      <header className="header">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
        >
          <div>
            <h1>Snap3D Viewer</h1>
            <p>Modern GLB/GLTF/USDZ Visualization Engine</p>
          </div>
          {modelUrl && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                className="reset-button" 
                onClick={() => setShowAR(true)} 
                style={{ borderColor: 'rgba(0, 122, 255, 0.4)', color: '#007AFF' }}
              >
                <Camera size={18} />
                AR Görünümü
              </button>
              <button className="reset-button" onClick={handleReset}>
                <Upload size={16} />
                Yeni Model
              </button>
            </div>
          )}
        </motion.div>
      </header>

      <div className="instructions">
        <p><HelpCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Left click to Rotate</p>
        <p>Right click to Pan</p>
        <p>Scroll to Zoom</p>
      </div>

      <div className="canvas-container">
        <ErrorBoundary>
          <ThreeViewer 
            modelUrl={modelUrl} 
            modelName={modelName}
            onSceneReady={setScene}
            exposure={exposure}
            shadows={shadows}
            envIntensity={envIntensity}
            bgColor={bgColor}
            autoRotate={autoRotate}
            wireframe={wireframe}
          />
        </ErrorBoundary>
      </div>

      <AnimatePresence>
        {modelUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overlay-container" 
          >
            <div className="controls-panel">
              <div className="control-row">
                <div className="control-item">
                  <label>IŞIK ŞİDDETİ (EXPOSURE)</label>
                  <input 
                    type="range" min="0" max="3" step="0.1" 
                    value={exposure} onChange={(e) => setExposure(parseFloat(e.target.value))} 
                  />
                  <span>{exposure.toFixed(1)}</span>
                </div>
                <div className="control-item">
                  <label>YANSIMA (REFLECTIONS)</label>
                  <input 
                    type="range" min="0" max="5" step="0.1" 
                    value={envIntensity} onChange={(e) => setEnvIntensity(parseFloat(e.target.value))} 
                  />
                  <span>{envIntensity.toFixed(1)}</span>
                </div>
              </div>

              <div className="control-row secondary">
                <div className="control-item">
                  <label>ARKA PLAN</label>
                  <input 
                    type="color" 
                    value={bgColor} onChange={(e) => setBgColor(e.target.value)} 
                  />
                </div>
                <div className="control-item toggle">
                  <label>GÖLGE</label>
                  <input 
                    type="checkbox" 
                    checked={shadows} onChange={(e) => setShadows(e.target.checked)} 
                  />
                </div>
                <div className="control-item toggle">
                  <label>DÖNDÜR</label>
                  <input 
                    type="checkbox" 
                    checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} 
                  />
                </div>
                <div className="control-item toggle">
                  <label>KAFES</label>
                  <input 
                    type="checkbox" 
                    checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} 
                  />
                </div>
              </div>
            </div>
            <ExportPanel scene={scene} />
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={`drop-zone ${isDragging ? 'active' : ''}`} 
        onClick={triggerUpload}
        style={{ cursor: 'pointer' }}
      >
        <div className="drop-zone-content">
          <Upload className="upload-icon" size={48} />
          <h2>Click or Drop your 3D model</h2>
          <p>.glb or .gltf files supported</p>
        </div>
      </div>

      {!modelUrl && !isDragging && (
        <motion.div 
          className="drop-zone active"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ cursor: 'default' }}
        >
          <div className="drop-zone-content" style={{ opacity: 1, transform: 'scale(1)', border: 'none' }}>
            <Box className="upload-icon" size={64} style={{ opacity: 0.2 }} />
            <h2 style={{ opacity: 0.5 }}>Snap3D</h2>
            <p style={{ opacity: 0.3 }}>Drag a file anywhere or enter a URL below</p>
            
            <form onSubmit={handleUrlSubmit} className="url-input-form" onClick={(e) => e.stopPropagation()}>
              <input 
                type="text" 
                placeholder="https://example.com/model.glb" 
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                className="url-input"
                disabled={isLoading}
              />
              <button type="submit" className="url-submit-button" disabled={isLoading}>
                {isLoading ? 'Yükleniyor...' : 'Load Model'}
              </button>
            </form>

            {error && (
              <p className="error-message" style={{ color: '#ff4b2b', fontSize: '0.8rem', marginTop: '1rem', fontWeight: 600 }}>
                {error}
              </p>
            )}

            <div className="upload-divider">
              <span>OR</span>
            </div>

            <button className="premium-button" onClick={triggerUpload}>
              <Upload size={18} />
              Choose Local File
            </button>
          </div>
        </motion.div>
      )}
      <AnimatePresence>
        {showAR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ARView 
              modelUrl={modelUrl} 
              targetUrl={targetUrl}
              onClose={() => setShowAR(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
