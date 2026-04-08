import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AddImageToQR() {
  const navigate = useNavigate();
  const location = useLocation();
  const { qrUrl } = location.state || {};
  
  const [backgroundImage, setBackgroundImage] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [qrSize, setQrSize] = useState(120);
  const [qrPosition, setQrPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ size: 0, x: 0, y: 0 });
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-open file picker on mount
  useEffect(() => {
    if (!backgroundImage) {
      fileInputRef.current?.click();
    }
  }, [backgroundImage]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          setImageAspectRatio(aspectRatio);
          setBackgroundImage(event.target.result);
          
          // Position QR at bottom-left with margin after container renders
          setTimeout(() => {
            if (containerRef.current) {
              const containerHeight = containerRef.current.offsetHeight;
              setQrPosition({
                x: 20,
                y: containerHeight - qrSize - 20
              });
            }
          }, 100);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrMouseDown = (e) => {
    if (!containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left - qrPosition.x,
      y: e.clientY - rect.top - qrPosition.y
    });
  };

  const handleQrTouchStart = (e) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - rect.left - qrPosition.x,
      y: touch.clientY - rect.top - qrPosition.y
    });
  };

  const handleMove = (clientX, clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    if (isDragging) {
      let newX = clientX - rect.left - dragStart.x;
      let newY = clientY - rect.top - dragStart.y;
      
      // Constrain within bounds
      newX = Math.max(0, Math.min(newX, rect.width - qrSize));
      newY = Math.max(0, Math.min(newY, rect.height - qrSize));
      
      setQrPosition({ x: newX, y: newY });
    } else if (isResizing) {
      const deltaX = clientX - resizeStart.x;
      const deltaY = clientY - resizeStart.y;
      const delta = Math.max(deltaX, deltaY);
      
      let newSize = resizeStart.size + delta;
      newSize = Math.max(80, Math.min(newSize, rect.width * 0.6, rect.height * 0.6));
      
      // Adjust position if needed to stay in bounds
      const newX = Math.min(qrPosition.x, rect.width - newSize);
      const newY = Math.min(qrPosition.y, rect.height - newSize);
      
      setQrSize(newSize);
      setQrPosition({ x: newX, y: newY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging || isResizing) {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging || isResizing) {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      size: qrSize,
      x: e.type.includes('mouse') ? e.clientX : e.touches[0].clientX,
      y: e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
    });
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, qrPosition, qrSize, dragStart, resizeStart]);

  const handleDone = () => {
    navigate(createPageUrl('PreviewQR'), {
      state: {
        backgroundImage,
        qrUrl,
        qrPosition,
        qrSize,
        imageAspectRatio
      }
    });
  };

  if (!qrUrl) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6E6E73]">Error: No se encontró el código QR</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center border-b border-[#F0F0F0]">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-[#27251f]" />
        </button>
        <h1 className="text-xl font-semibold text-[#27251f] ml-2">Agregar imagen</h1>
      </div>

      {!backgroundImage ? (
        /* Loading state while file picker opens */
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#6E6E73]">Seleccionando imagen...</p>
        </div>
      ) : (
        <>
          {/* SCREEN 3: Image Editor */}
          <div className="px-6 flex-1 flex items-center justify-center py-8">
            <div 
              ref={containerRef}
              className="relative w-full max-w-md bg-[#F5F5F5] rounded-3xl overflow-hidden"
              style={{ aspectRatio: imageAspectRatio }}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Background Image */}
              <img
                src={backgroundImage}
                alt="Background"
                className="w-full h-full object-contain select-none"
                draggable={false}
              />
              
              {/* Overlay - Very subtle */}
              <div className="absolute inset-0 bg-[#004afe] opacity-[0.03] pointer-events-none" />
              
              {/* Grid Lines - Subtle */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]">
                <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="#ffffff" strokeWidth="1" />
                <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="#ffffff" strokeWidth="1" />
                <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="#ffffff" strokeWidth="1" />
                <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="#ffffff" strokeWidth="1" />
              </svg>
              
              {/* Corner Zone Guides - Recommended placement */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-5 left-5 w-24 h-24 border-2 border-dashed border-[#004afe] opacity-15 rounded-xl" />
                <div className="absolute top-5 right-5 w-24 h-24 border-2 border-dashed border-[#004afe] opacity-15 rounded-xl" />
                <div className="absolute bottom-5 left-5 w-24 h-24 border-2 border-dashed border-[#004afe] opacity-15 rounded-xl" />
                <div className="absolute bottom-5 right-5 w-24 h-24 border-2 border-dashed border-[#004afe] opacity-15 rounded-xl" />
              </div>

              {/* QR Code with Scanner Corners */}
              <div
                style={{
                  left: `${qrPosition.x}px`,
                  top: `${qrPosition.y}px`,
                  width: `${qrSize}px`,
                  height: `${qrSize}px`
                }}
                className="absolute cursor-move select-none"
                onMouseDown={handleQrMouseDown}
                onTouchStart={handleQrTouchStart}
              >
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="w-full h-full bg-white shadow-xl pointer-events-none"
                  draggable={false}
                />
                
                {/* Scanner Corner Brackets */}
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-[3px] border-l-[3px] border-[#004afe] rounded-tl-md pointer-events-none" />
                <div className="absolute -top-2 -right-2 w-6 h-6 border-t-[3px] border-r-[3px] border-[#004afe] rounded-tr-md pointer-events-none" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-[3px] border-l-[3px] border-[#004afe] rounded-bl-md pointer-events-none" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-[3px] border-r-[3px] border-[#004afe] rounded-br-md pointer-events-none" />
                
                {/* Resize Handle - Bottom Right Corner */}
                <div
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#004afe] rounded-full cursor-nwse-resize flex items-center justify-center shadow-lg"
                  onMouseDown={handleResizeStart}
                  onTouchStart={handleResizeStart}
                >
                  <div className="w-3 h-3 border-2 border-white rounded-sm" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-[#6E6E73] px-6 pb-4">
            Arrastra para mover • Esquina para redimensionar
          </p>

          {/* Bottom Button */}
          <div className="px-6 pb-8">
            <Button
              onClick={handleDone}
              className="w-full bg-[#004afe] rounded-full h-14 text-white text-[15px] font-medium flex items-center justify-between px-6"
            >
              <span>Listo</span>
              <Check className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}