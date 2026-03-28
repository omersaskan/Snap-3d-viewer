import * as THREE from 'three'
// @ts-ignore
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'
import { Download } from 'lucide-react'

interface ExportPanelProps {
  scene: THREE.Scene | null
}

export const ExportPanel = ({ scene }: ExportPanelProps) => {

  const exportGLB = () => {
    if (!scene) return
    const model = scene.getObjectByName('exported-model')
    if (!model) return

    const exporter = new GLTFExporter()
    exporter.parse(
      model,
      (result: any) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'application/octet-stream' })
          save(blob, 'model.glb')
        }
      },
      (error: any) => console.error(error),
      { binary: true, onlyVisible: true }
    )
  }

  const save = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  return (
    <div className="export-panel">
      <div className="export-group">
        <button onClick={exportGLB} className="premium-button">
          <Download size={16} />
          <span>GLB</span>
        </button>
      </div>
    </div>
  )
}
