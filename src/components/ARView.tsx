import React, { useEffect } from 'react';

interface ARViewProps {
  modelUrl: string | null;
  onClose: () => void;
}

export const ARView: React.FC<ARViewProps> = ({ modelUrl, onClose }) => {
  useEffect(() => {
    console.log('ARView Mounted. modelUrl:', modelUrl);
    
    const handleMessage = (event: MessageEvent) => {
      console.log('ARView received message:', event.data);
      if (event.data === 'close-ar') {
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      console.log('ARView Unmounting...');
      window.removeEventListener('message', handleMessage);
    };
  }, [onClose, modelUrl]);

  if (!modelUrl) {
    console.error('ARView: modelUrl is missing!');
    return null;
  }

  const encodedModelUrl = encodeURIComponent(modelUrl);
  const iframeSrc = `/ar-view.html?model=${encodedModelUrl}`;
  console.log('Setting iframe src to:', iframeSrc);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999, // Hepsinden üstte olduğundan emin olmak için
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <iframe 
        src={iframeSrc}
        title="AR Experience"
        onLoad={() => console.log('AR Iframe loaded successfully')}
        onError={() => console.error('AR Iframe failed to load')}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#000'
        }}
        allow="camera; microphone; accelerometer; gyroscope; magnetometer; xr-spatial-tracking"
      />
    </div>
  );
};
