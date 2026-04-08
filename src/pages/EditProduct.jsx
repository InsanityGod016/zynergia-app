import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function EditProduct() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const product = location.state?.product;

  const [linkUrl, setLinkUrl] = useState(product?.link_url || '');

  const updateMutation = useMutation({
    mutationFn: (data) => db.Product.update(product.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate(createPageUrl('Products'));
    }
  });

  const handleSave = () => {
    updateMutation.mutate({ link_url: linkUrl });
  };

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl('Products'))}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#27251f]" />
        </button>
        <h1 className="text-lg font-semibold text-[#27251f]">{product.name}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pb-32">
        {/* Product Image */}
        <div className="w-full aspect-square bg-[#F5F5F5] rounded-3xl flex items-center justify-center mb-8 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl font-bold text-[#004AFE]">
              {product.name.charAt(0)}
            </span>
          )}
        </div>

        {/* URL Field */}
        <div className="mb-6">
          <label className="block text-[13px] font-medium text-[#27251f] mb-2">
            URL
          </label>
          <Input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="h-12 rounded-full border-[#E2E8F0] text-[15px]"
          />
        </div>
      </div>

      {/* Save Button — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#EAEAEA]">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full h-14 bg-[#004AFE] hover:bg-[#0039CC] text-white rounded-full text-[15px] font-medium"
        >
          {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}