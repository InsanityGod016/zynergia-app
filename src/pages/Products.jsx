import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CATEGORIES = ['Premier Kits', 'Compra Única'];

const SUBCATEGORIES = {
  'Premier Kits': [
    'SANKI',
    'ZURBITA',
    'ESSENTIALOIL+ KITS',
    'RESTORE SUPPLEMENT KITS',
    'IMMUNE SUPPLEMENT KITS',
    'COSMÉTICA CIENTÍFICA',
  ],
  'Compra Única': [
    'SANKI',
    'ZURBITA',
    'MEGA SUPPLEMENTS',
    'RESTORE SUPPLEMENTS',
    'IMMUNE SUPPLEMENTS',
    'GUT HEALTH SUPPLEMENTS',
    'COSMÉTICA CIENTÍFICA',
  ],
};

export default function Products() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('Premier Kits');
  const [selectedProductId, setSelectedProductId] = useState(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list()
  });

  const filteredProducts = useMemo(() => {
    return products.filter(p => (p.category || 'Premier Kits') === selectedCategory);
  }, [products, selectedCategory]);

  const groupedProducts = useMemo(() => {
    const groups = {};
    const subcats = SUBCATEGORIES[selectedCategory] || [];
    subcats.forEach(sub => {
      groups[sub] = filteredProducts.filter(p => p.subcategory === sub);
    });
    return groups;
  }, [filteredProducts, selectedCategory]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl('Marketing'))}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#27251f]" />
        </button>
        <h1 className="text-lg font-semibold text-[#27251f]">Productos</h1>
        <div className="w-10" />
      </div>

      {/* Category Tabs */}
      <div className="px-5 mb-6">
        <div className="flex gap-8 justify-center border-b border-[#EAEAEA]">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`pb-3 text-[15px] font-medium relative transition-colors ${
                selectedCategory === cat
                  ? 'text-[#004AFE]'
                  : 'text-[#6E6E73]'
              }`}
            >
              {cat}
              {selectedCategory === cat && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#004AFE]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Products by Subcategory */}
      <div className="px-5 pb-8">
        {(SUBCATEGORIES[selectedCategory] || []).map(subcategory => {
          const subcategoryProducts = groupedProducts[subcategory];
          if (!subcategoryProducts || subcategoryProducts.length === 0) return null;

          return (
            <div key={subcategory} className="mb-8">
              {/* Subcategory Header */}
              <h2 className="text-[13px] font-medium text-[#27251f] mb-4 tracking-wide">
                {subcategory}
              </h2>

              {/* Product Grid */}
              <div className="grid grid-cols-2 gap-4">
                {subcategoryProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setTimeout(() => {
                        navigate(createPageUrl('EditProduct'), { state: { product } });
                      }, 200);
                    }}
                    className={`bg-white rounded-3xl overflow-hidden shadow-sm text-left transition-all border-2 ${
                      selectedProductId === product.id
                        ? 'border-[#004AFE] shadow-md'
                        : 'border-[#EAEAEA]'
                    }`}
                  >
                    {/* Product Image */}
                    <div className="w-full aspect-square bg-[#F5F5F5] flex items-center justify-center">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-[#004AFE]">
                          {product.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-[#27251f] text-[14px] mb-1">
                        {product.name}
                      </h3>
                      {selectedCategory === 'Premier Kits' && (
                        <p className="text-[12px] text-[#6E6E73]">
                          Cada 2 meses
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#6E6E73] text-sm">No hay productos en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}