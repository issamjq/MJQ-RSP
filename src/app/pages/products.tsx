import { AppSidebar } from '../components/app-sidebar';
import { Package, Search, Grid3x3, List, RefreshCw, Download, Plus, Edit, Trash2, MoreVertical, X } from 'lucide-react';
import { useState } from 'react';

export function Products() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const products = [
    {
      id: 1,
      name: 'AXIS-Y Artichoke Intensive Skin Barrier Ampoule 30ml',
      brand: 'Axis-Y',
      sku: '#SKU-12967243',
      barcode: '#03758AR-GRF-4DY',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&h=300&fit=crop',
      price: 'AED 125.00',
      stock: 45
    },
    {
      id: 2,
      name: 'AXIS-Y CALAMINE Pore Control Capsule Serum 50ml',
      brand: 'Axis-Y',
      sku: '#SKU-34434535',
      barcode: '#779F91F-5RR-6DC',
      image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop',
      price: 'AED 98.00',
      stock: 32
    },
    {
      id: 3,
      name: 'AXIS-Y Daily Purifying Treatment Toner 200ml',
      brand: 'Axis-Y',
      sku: '#SKU-1456-7924',
      barcode: '#F5718AA1-RCX-4ZBF',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop',
      price: 'AED 87.00',
      stock: 28
    },
    {
      id: 4,
      name: 'AXIS-Y Dark Spot Correcting Glow Cream 50ml',
      brand: 'Axis-Y',
      sku: '#SKU-34541258',
      barcode: '#B1EF409E-99X1-4CX-R',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop',
      price: 'AED 112.00',
      stock: 18
    },
    {
      id: 5,
      name: 'AXIS-Y Dark Spot Correcting Glow Toner 125ml',
      brand: 'Axis-Y',
      sku: '#SKU-54564894',
      barcode: '#0AMVD79-A-QLL-2T16',
      image: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=300&h=300&fit=crop',
      price: 'AED 76.00',
      stock: 56
    },
    {
      id: 6,
      name: 'AXIS-Y Heartleaf My Type Calming Cream 60ml',
      brand: 'Axis-Y',
      sku: '#SKU-49323333',
      barcode: '#S1T153MG-GTCZ-4ZY',
      image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=300&h=300&fit=crop',
      price: 'AED 95.00',
      stock: 41
    },
    {
      id: 7,
      name: 'AXIS-Y Mugwort Green Vital Energy Complex Sheet Mask',
      brand: 'Axis-Y',
      sku: '#SKU-90541238',
      barcode: '#186A7A52-TGLZ-5RS1',
      image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&h=300&fit=crop',
      price: 'AED 15.00',
      stock: 120
    },
    {
      id: 8,
      name: 'AXIS-Y Mugwort Pore Clarifying Wash Off Pack 100ml',
      brand: 'Axis-Y',
      sku: '#SKU-89745623',
      barcode: '#34JM712G-5GF7-56AA',
      image: 'https://images.unsplash.com/photo-1615397349754-0e6d8a75bc04?w=300&h=300&fit=crop',
      price: 'AED 68.00',
      stock: 37
    },
    {
      id: 9,
      name: 'AXIS-Y New Skin Resolution Gel Mask 100ml',
      brand: 'Axis-Y',
      sku: '#SKU-78945612',
      barcode: '#PK4193A9-PRG-978S',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop',
      price: 'AED 82.00',
      stock: 29
    },
    {
      id: 10,
      name: 'AXIS-Y New Skin Resolution Gel Mask 50ml',
      brand: 'Axis-Y',
      sku: '#SKU-56412387',
      barcode: '#04M3KRAE-9EZ7-4AB2',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop',
      price: 'AED 55.00',
      stock: 63
    },
    {
      id: 11,
      name: 'AXIS-Y PANTHENOL 10 Skin Smoothing Face Shield Cream',
      brand: 'Axis-Y',
      sku: '#SKU-71024587',
      barcode: '#A62SRG4-5XD6-97HL',
      image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop',
      price: 'AED 104.00',
      stock: 22
    },
    {
      id: 12,
      name: 'AXIS-Y Spot the Difference Blemish Treatment 15ml',
      brand: 'Axis-Y',
      sku: '#SKU-98745632',
      barcode: '#A1PTAQM8-3-23I-RQX',
      image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=300&h=300&fit=crop',
      price: 'AED 45.00',
      stock: 88
    },
  ];

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Products</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredProducts.length} products · reference catalog
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
                <Download className="w-4 h-4" />
                Import CSV
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
            />
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors">
                        <Edit className="w-4 h-4 text-gray-700" />
                      </button>
                      <button className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-4">
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        {product.brand}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium mb-2 line-clamp-2 min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>{product.sku}</p>
                      <p>{product.barcode}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {product.price}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                      Product
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                      Brand
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                      SKU
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                      Barcode
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                      Price
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                      Stock
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="font-medium text-sm max-w-xs">
                            {product.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {product.brand}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {product.barcode}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        {product.price}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {product.stock}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-xl p-12 border border-gray-100 shadow-sm text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h2 className="text-lg font-semibold mb-2">No products found</h2>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search query
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <>
          {/* Backdrop with blur */}
          <div 
            className="fixed inset-0 z-50 bg-white/10 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          
          {/* Modal Panel sliding from right */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add Product</h2>
                <button 
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors" 
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Form */}
              <form className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter product name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter brand"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input 
                    type="text" 
                    placeholder="#SKU-XXXXXXXX"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode
                  </label>
                  <input 
                    type="text" 
                    placeholder="#XXXXXXXX-XXX-XXX"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <input 
                    type="text" 
                    placeholder="AED 0.00"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock
                  </label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2.5 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm"
                  >
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}