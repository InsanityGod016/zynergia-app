import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { ArrowLeft } from 'lucide-react';

const CATEGORIES = {
  'Premier Kits': [
    'SANKI',
    'ZURBITA',
    'ESSENTIALOIL+ KITS',
    'RESTORE SUPPLEMENT KITS',
    'IMMUNE SUPPLEMENT KITS',
    'GUT HEALTH SUPPLEMENT KITS',
    'COSMÉTICA CIENTÍFICA KITS'
  ],
  'Compra Única': [
    'SANKI',
    'ZURBITA',
    'TEST',
    'MEGA SUPPLEMENTS',
    'RESTORE SUPPLEMENTS',
    'IMMUNE SUPPLEMENTS',
    'GUT HEALTH SUPPLEMENTS',
    'COSMÉTICA CIENTÍFICA'
  ]
};

export default function NewSale2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contactId } = location.state || {};
  
  const [selectedCategory, setSelectedCategory] = useState('Premier Kits');
  const [selectedProductId, setSelectedProductId] = useState(null);
  
  const handleSelectProduct = (productId) => {
    setSelectedProductId(productId);
    setTimeout(() => {
      navigate(createPageUrl('NewSale3'), {
        state: { contactId, productId }
      });
    }, 200);
  };

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list()
  });

  const filteredProducts = products.filter(p => p.category === selectedCategory);

  const groupedProducts = CATEGORIES[selectedCategory].reduce((acc, subcategory) => {
    acc[subcategory] = filteredProducts.filter(p => p.subcategory === subcategory);
    return acc;
  }, {});



  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center -ml-2 relative z-10 active:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5 text-[#27251f]" />
        </button>
        <h1 className="text-xl font-semibold text-[#27251f] ml-2">Seleccionar producto</h1>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-[#F0F0F0]">
        <div className="px-6 flex gap-8 justify-center">
          {Object.keys(CATEGORIES).map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`pb-3 text-[15px] font-medium transition-colors relative ${
                selectedCategory === category
                  ? 'text-[#004AFE]'
                  : 'text-[#6E6E73]'
              }`}
            >
              {category}
              {selectedCategory === category && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#004AFE]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-6 pt-6 pb-6 space-y-8">
        {CATEGORIES[selectedCategory].map(subcategory => {
          const subcategoryProducts = groupedProducts[subcategory] || [];
          if (subcategoryProducts.length === 0) return null;

          return (
            <div key={subcategory}>
              <h2 className="text-sm font-semibold text-[#6E6E73] mb-3 uppercase tracking-wide">
                {subcategory}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {subcategoryProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product.id)}
                    className={`bg-white rounded-3xl p-3 border-2 text-left transition-all ${
                      selectedProductId === product.id
                        ? 'border-[#004AFE] shadow-md'
                        : 'border-[#EAEAEA]'
                    }`}
                  >
                    {product.image_url && (
                      <div className="aspect-square rounded-xl bg-[#F5F5F5] mb-2 overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-[#27251f] text-[13px] leading-tight">
                      {product.name}
                    </h3>
                    {product.frequency_months && (
                      <p className="text-[11px] text-[#6E6E73] mt-1">
                        Cada {product.frequency_months} meses
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}