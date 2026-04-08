import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Download, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PreviewQR() {
  const navigate = useNavigate();
  const location = useLocation();
  const { backgroundImage, qrUrl, qrPosition, qrSize, imageAspectRatio } = location.state || {};
  
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const composedImageRef = useRef('');

  useEffect(() => {
    if (backgroundImage && qrUrl && previewRef.current) {
      const container = previewRef.current;
      
      // Create canvas for export
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = () => {
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        
        // Draw background
        ctx.drawImage(bgImg, 0, 0);
        
        // Calculate scale based on how image is displayed
        // Since we use object-contain, we need to find the actual display dimensions
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const imageRatio = bgImg.width / bgImg.height;
        const containerRatio = containerWidth / containerHeight;
        
        let displayWidth, displayHeight, scale;
        
        if (imageRatio > containerRatio) {
          // Image is wider - constrained by width
          displayWidth = containerWidth;
          displayHeight = containerWidth / imageRatio;
          scale = bgImg.width / displayWidth;
        } else {
          // Image is taller - constrained by height
          displayHeight = containerHeight;
          displayWidth = containerHeight * imageRatio;
          scale = bgImg.height / displayHeight;
        }
        
        // Calculate QR size and position in actual image coordinates
        const actualQrSize = qrSize * scale;
        const actualQrX = qrPosition.x * scale;
        const actualQrY = qrPosition.y * scale;
        
        // Draw QR
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        qrImg.onload = () => {
          ctx.drawImage(qrImg, actualQrX, actualQrY, actualQrSize, actualQrSize);
          composedImageRef.current = canvas.toDataURL('image/png');
        };
        qrImg.src = qrUrl;
      };
      bgImg.src = backgroundImage;
    }
  }, [backgroundImage, qrUrl, qrPosition, qrSize]);

  const handleDownload = () => {
    if (composedImageRef.current) {
      const link = document.createElement('a');
      link.href = composedImageRef.current;
      link.download = 'imagen-con-qr.png';
      link.click();
    }
  };

  const handleShare = async () => {
    if (composedImageRef.current) {
      try {
        const response = await fetch(composedImageRef.current);
        const blob = await response.blob();
        const file = new File([blob], 'imagen-con-qr.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Imagen con QR'
          });
        }
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleDone = () => {
    navigate(createPageUrl('Marketing'));
  };

  if (!backgroundImage || !qrUrl) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6E6E73]">Error: No se encontró la imagen</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center border-b border-[#F0F0F0]">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-[#27251f]" />
        </button>
        <h1 className="text-xl font-semibold text-[#27251f] ml-2">Vista previa</h1>
      </div>

      {/* SCREEN 4: Final Preview */}
      <div className="px-6 flex-1 flex items-center justify-center py-12">
        <div 
          ref={previewRef}
          className="relative w-full bg-[#F5F5F5] rounded-3xl overflow-hidden shadow-lg"
          style={{ 
            maxWidth: 'calc(100vw - 48px)',
            aspectRatio: imageAspectRatio || 1
          }}
        >
          <img
            src={backgroundImage}
            alt="Background"
            className="w-full h-full object-contain"
          />
          <img
            src={qrUrl}
            alt="QR Code"
            style={{
              left: `${qrPosition.x}px`,
              top: `${qrPosition.y}px`,
              width: `${qrSize}px`,
              height: `${qrSize}px`
            }}
            className="absolute bg-white"
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Action Buttons */}
      <div className="px-6 pb-6 space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1 border-[#E5E5E5] text-[#27251f] rounded-full h-9 text-sm font-medium"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Descargar
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1 border-[#E5E5E5] text-[#27251f] rounded-full h-9 text-sm font-medium"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Compartir
          </Button>
        </div>
      </div>

      {/* Done Button */}
      <div className="px-6 pb-8">
        <Button
          onClick={handleDone}
          className="w-full bg-[#004afe] rounded-full h-14 text-white text-[15px] font-medium flex items-center justify-between px-6"
        >
          <span>Listo</span>
          <Check className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}