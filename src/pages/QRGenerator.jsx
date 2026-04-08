import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, ArrowRight, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function QRGenerator() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('classic');

  const qrStyles = [
    { id: 'classic', name: 'Cuadrado clásico', param: '' },
    { id: 'rounded', name: 'Esquinas redondeadas', param: '&qzone=1' },
    { id: 'dots', name: 'Puntos/círculos', param: '&format=svg' },
    { id: 'bold', name: 'Bold', param: '&margin=0' }
  ];

  const handleGenerateQR = () => {
    if (!url.trim()) return;
    const styleParam = qrStyles.find(s => s.id === selectedStyle)?.param || '';
    const generatedQR = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url.trim())}${styleParam}`;
    setQrUrl(generatedQR);
  };

  const handleStyleChange = (styleId) => {
    setSelectedStyle(styleId);
    if (qrUrl && url.trim()) {
      const styleParam = qrStyles.find(s => s.id === styleId)?.param || '';
      const updatedQR = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url.trim())}${styleParam}`;
      setQrUrl(updatedQR);
    }
  };

  const handleDownload = async () => {
    if (qrUrl) {
      try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'qr-code.png';
        link.click();
      } catch (error) {
        console.error('Error downloading:', error);
      }
    }
  };

  const handleShare = async () => {
    if (qrUrl) {
      try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const file = new File([blob], 'qr-code.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Código QR'
          });
        }
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleAddImage = () => {
    navigate(createPageUrl('AddImageToQR'), {
      state: { qrUrl, url, selectedStyle }
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center border-b border-[#F0F0F0]">
        <button
          onClick={() => navigate(createPageUrl('Marketing'))}
          className="w-10 h-10 flex items-center justify-center -ml-2 relative z-10"
        >
          <ArrowLeft className="w-5 h-5 text-[#27251f]" />
        </button>
        <h1 className="text-xl font-semibold text-[#27251f] ml-2">Generar QR</h1>
      </div>

      {!qrUrl ? (
        /* SCREEN 1: Input */
        <>
          <div className="px-6 flex-1 flex flex-col justify-center -mt-20">
            {/* Sample QR */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=https://example.com"
                  alt="Sample QR"
                  className="w-44 h-44 bg-white"
                />
                {/* Scanner Corner Brackets */}
                <div className="absolute -top-3 -left-3 w-8 h-8 border-t-[3px] border-l-[3px] border-[#004afe] rounded-tl-md" />
                <div className="absolute -top-3 -right-3 w-8 h-8 border-t-[3px] border-r-[3px] border-[#004afe] rounded-tr-md" />
                <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-[3px] border-l-[3px] border-[#004afe] rounded-bl-md" />
                <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-[3px] border-r-[3px] border-[#004afe] rounded-br-md" />
              </div>
            </div>

            <div className="space-y-3 max-w-md mx-auto w-full">
              <Label className="text-[15px] font-medium text-[#27251f]">Enlace</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="border-[#E5E5E5] rounded-full h-14 px-5 text-[15px] focus:border-[#004afe] focus:ring-1 focus:ring-[#004afe]"
              />
              <p className="text-sm text-[#6E6E73] pl-5">Pega aquí tu enlace</p>
            </div>
          </div>
          <div className="px-6 pb-8">
            <Button
              onClick={handleGenerateQR}
              disabled={!url.trim()}
              className="w-full bg-[#004afe] disabled:bg-[#E5E5E5] disabled:text-[#A0A0A0] rounded-full h-14 text-white text-[15px] font-medium flex items-center justify-between px-6"
            >
              <span>Generar QR</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </>
      ) : (
        /* SCREEN 2: QR Generated */
        <>
          <div className="px-6 flex-1 flex flex-col pt-10">
            {/* QR with Corner Scanner */}
            <div className="flex justify-center mb-10">
              <div className="relative">
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="w-52 h-52 bg-white"
                />
                {/* Corner Scanner Brackets */}
                <div className="absolute -top-3 -left-3 w-8 h-8 border-t-[3px] border-l-[3px] border-[#004afe] rounded-tl-md" />
                <div className="absolute -top-3 -right-3 w-8 h-8 border-t-[3px] border-r-[3px] border-[#004afe] rounded-tr-md" />
                <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-[3px] border-l-[3px] border-[#004afe] rounded-bl-md" />
                <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-[3px] border-r-[3px] border-[#004afe] rounded-br-md" />
              </div>
            </div>

            {/* Style Selector */}
            <div className="mb-8">
              <p className="text-sm font-medium text-[#27251f] mb-4">Estilo</p>
              <div className="flex gap-3 justify-center">
                {qrStyles.map(style => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className={`flex-shrink-0 transition-all ${
                      selectedStyle === style.id ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all ${
                      selectedStyle === style.id
                        ? 'border-[#004afe] bg-[#004afe]/5'
                        : 'border-[#E5E5E5] bg-white'
                    }`}>
                      <div 
                        className="w-9 h-9 bg-[#27251f]"
                        style={{
                          borderRadius: style.id === 'rounded' ? '4px' : style.id === 'dots' ? '50%' : '2px',
                          backgroundImage: style.id === 'dots' ? 'radial-gradient(circle, #27251f 30%, transparent 30%)' : undefined,
                          backgroundSize: style.id === 'dots' ? '5px 5px' : undefined,
                          border: style.id === 'bold' ? '2.5px solid #27251f' : undefined
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-6 justify-center">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="border-[#E5E5E5] text-[#27251f] rounded-full h-9 px-4 text-sm font-medium"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar QR
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-[#E5E5E5] text-[#27251f] rounded-full h-9 px-4 text-sm font-medium"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Compartir QR
              </Button>
            </div>
          </div>

          <div className="px-6 pb-8">
            <Button
              onClick={handleAddImage}
              className="w-full bg-[#004afe] rounded-full h-14 text-white text-[15px] font-medium flex items-center justify-between px-6"
            >
              <span>Agregar imagen</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}