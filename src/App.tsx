import { useState, useCallback, useRef } from 'react'
import { Viewer3D } from './components/Viewer3D'
import { Upload, HelpCircle, Box } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './index.css'

function App() {
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [environment, setEnvironment] = useState<"city" | "park" | "studio" | "warehouse" | "sunset">('city')
  const [bloom, setBloom] = useState(false)
  const [ssao, setSsao] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
      const url = URL.createObjectURL(file)
      setModelUrl(url)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
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
        accept=".glb,.gltf" 
        style={{ display: 'none' }} 
      />

      <header className="header">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1>Snap3D Viewer</h1>
          <p>Modern GLB/GLTF Visualization Engine</p>
        </motion.div>
      </header>

      <div className="instructions">
        <p><HelpCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Left click to Rotate</p>
        <p>Right click to Pan</p>
        <p>Scroll to Zoom</p>
      </div>

      <Viewer3D 
        modelUrl={modelUrl} 
        environmentPreset={environment}
        enableBloom={bloom}
        enableSsao={ssao}
      />

      <AnimatePresence>
        {modelUrl && (
          <motion.div 
            className="ui-overlay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="controls-group">
              <select 
                value={environment} 
                onChange={(e) => setEnvironment(e.target.value as "city" | "park" | "studio" | "warehouse" | "sunset")}
                className="premium-select"
              >
                <option value="city">City</option>
                <option value="park">Park</option>
                <option value="studio">Studio</option>
                <option value="warehouse">Warehouse</option>
                <option value="sunset">Sunset</option>
              </select>
              
              <button 
                onClick={() => setBloom(!bloom)} 
                className={`toggle-button ${bloom ? 'active' : ''}`}
              >
                Bloom
              </button>
              
              <button 
                onClick={() => setSsao(!ssao)} 
                className={`toggle-button ${ssao ? 'active' : ''}`}
              >
                SSAO
              </button>
            </div>
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
          onClick={triggerUpload}
          style={{ cursor: 'pointer' }}
        >
          <div className="drop-zone-content" style={{ opacity: 1, transform: 'scale(1)', border: 'none' }}>
            <Box className="upload-icon" size={64} style={{ opacity: 0.2 }} />
            <h2 style={{ opacity: 0.5 }}>Snap3D</h2>
            <p style={{ opacity: 0.3 }}>Click or drag a file anywhere to begin</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default App
