import { useThree } from '@react-three/fiber'
// @ts-ignore
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'
import { Download } from 'lucide-react'

export const ExportPanel = () => {
  const { scene } = useThree()

  const exportBinary = () => {
    const exporter = new GLTFExporter()
    
    exporter.parse(
      scene,
      (result: any) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'exported-model.glb'
          link.click()
        }
      },
      (error: any) => {
        console.error('An error happened during export:', error)
      },
      {
        binary: true,
        onlyVisible: true,
        includeCustomExtensions: true
      }
    )
  }

  return (
    <div className="export-panel">
      <button onClick={exportBinary} className="premium-button">
        <Download size={18} />
        <span>Export GLB</span>
      </button>
    </div>
  )
}
