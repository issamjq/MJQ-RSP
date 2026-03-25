import { AppSidebar } from '../components/app-sidebar';
import { Compass, Sparkles, Search, ChevronDown, Check, ArrowRight, RefreshCw, ExternalLink, Play, Edit, Trash2, X, FileDown, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

export function Discovering() {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [productSortBy, setProductSortBy] = useState('name');
  const [priceSortBy, setPriceSortBy] = useState('price');
  const [priceCompanyFilter, setPriceCompanyFilter] = useState('all');

  const steps = [
    { number: 1, title: 'Discover', description: 'Search products' },
    { number: 2, title: 'Product URLs', description: 'Review mappings' },
    { number: 3, title: 'Scrape Prices', description: 'Get latest prices' },
  ];

  const companies = [
    { value: 'amazon', label: 'Amazon AE' },
    { value: 'binsina', label: 'Bin Sina Pharmacy' },
    { value: 'carrefour', label: 'Carrefour UAE' },
    { value: 'chemist', label: 'Chemist Warehouse' },
    { value: 'life', label: 'Life Pharmacy' },
    { value: 'noon', label: 'Noon' },
  ];

  const filteredCompanies = companies.filter(company =>
    company.label.toLowerCase().includes(companySearch.toLowerCase())
  );

  const toggleCompany = (value: string) => {
    setSelectedCompanies(prev =>
      prev.includes(value)
        ? prev.filter(c => c !== value)
        : [...prev, value]
    );
  };

  const removeCompany = (value: string) => {
    setSelectedCompanies(prev => prev.filter(c => c !== value));
  };

  const mockProducts = [
    {
      id: 1,
      name: 'Marvis Amarelli Licorice 75 ML',
      sku: '3187',
      company: 'Amazon AE',
      url: 'https://www.amazon.ae/MARV...',
      status: 'success',
      lastChecked: '25/03/2026 14:24',
      active: true,
      price: 'AED 57.00',
      oldPrice: null,
      discount: null,
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=100&h=100&fit=crop'
    },
    {
      id: 2,
      name: 'Marvis Amarelli Licorice 75 ML',
      sku: '3187',
      company: 'Bin Sina Pharmacy',
      url: 'https://www.binsina.ae/en/buy...',
      status: 'success',
      lastChecked: '25/03/2026 14:20',
      active: true,
      price: 'AED 52.00',
      oldPrice: 'AED 57.00',
      discount: '-9%',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=100&h=100&fit=crop'
    },
    {
      id: 3,
      name: 'Marvis Aquatic Mint 25ML',
      sku: '3124',
      company: 'Bin Sina Pharmacy',
      url: 'https://www.binsina.ae/en/buy...',
      status: 'success',
      lastChecked: '25/03/2026 14:20',
      active: true,
      price: 'AED 45.00',
      oldPrice: null,
      discount: null,
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=100&h=100&fit=crop'
    },
  ];

  const mockPrices = [
    {
      id: 1,
      name: 'Marvis Sensitive Gums Gentle Mint 75 ML',
      company: 'Carrefour UAE',
      price: 'AED 57.00',
      oldPrice: null,
      discount: null,
      status: 'In Stock',
      statusType: 'success',
      lastUpdated: '25/03/2026 14:25',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop'
    },
    {
      id: 2,
      name: 'Marvis Whitening Mint 75 ML',
      company: 'Amazon AE',
      price: 'AED 57.00',
      oldPrice: null,
      discount: null,
      status: 'In Stock',
      statusType: 'success',
      lastUpdated: '25/03/2026 14:23',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop'
    },
    {
      id: 3,
      name: 'Marvis Whitening Mint 75 ML',
      company: 'Life Pharmacy',
      price: 'AED 47.50',
      oldPrice: 'AED 57.00',
      discount: '-17%',
      status: 'In Stock',
      statusType: 'success',
      lastUpdated: '25/03/2026 14:26',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop'
    },
    {
      id: 4,
      name: 'Marvis Whitening Mint 75 ML',
      company: 'Bin Sina Pharmacy',
      price: 'AED 57.00',
      oldPrice: null,
      discount: null,
      status: 'In Stock',
      statusType: 'success',
      lastUpdated: '25/03/2026 14:23',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop'
    },
    {
      id: 5,
      name: 'Marvis Whitening Mint 75 ML',
      company: 'Chemist Warehouse',
      price: 'AED 49.99',
      oldPrice: 'AED 57.00',
      discount: '-12%',
      status: 'In Stock',
      statusType: 'success',
      lastUpdated: '25/03/2026 14:25',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop'
    },
    {
      id: 6,
      name: 'Marvis Classic Strong Mint 75 ML',
      company: 'Amazon AE',
      price: 'AED 50.00',
      oldPrice: null,
      discount: null,
      status: 'unknown',
      statusType: 'success',
      lastUpdated: '25/03/2026 14:25',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop'
    },
  ];

  const handleDiscover = () => {
    setIsDiscovering(true);
    setTimeout(() => {
      setIsDiscovering(false);
      setCurrentStep(2);
    }, 2000);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6" />
                <h1 className="text-2xl font-semibold">Auto-Discover Products</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered product discovery — Search one retailer or all at once
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="bg-white rounded-xl p-6 mb-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                        currentStep > step.number
                          ? 'bg-green-500 text-white'
                          : currentStep === step.number
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-gray-300 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 1 && (
            <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-[#CBAE64] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">
                    Discover Products with AI
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Claude AI matches found products to your catalog
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Search Query */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Search Query{' '}
                      <span className="text-muted-foreground font-normal">
                        (any brand or product name)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. marvis, dove, colgate..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                    />
                  </div>

                  {/* Company Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company{' '}
                      <span className="text-muted-foreground font-normal">
                        (leave blank to search all)
                      </span>
                    </label>
                    <div className="relative">
                      <div
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-black/5 transition-all cursor-pointer"
                        onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                      >
                        {selectedCompanies.length > 0
                          ? selectedCompanies.map(company =>
                              companies.find(c => c.value === company)?.label
                            ).join(', ')
                          : 'All Companies'}
                      </div>
                      <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      {showCompanyDropdown && (
                        <div className="absolute z-10 w-full bg-white rounded-lg shadow-lg mt-1">
                          <input
                            type="text"
                            placeholder="Search companies..."
                            value={companySearch}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            className="w-full px-4 py-2 border-b border-gray-200 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                          />
                          <div className="max-h-40 overflow-y-auto">
                            {filteredCompanies.map(company => (
                              <div
                                key={company.value}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => toggleCompany(company.value)}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedCompanies.includes(company.value)}
                                    onChange={() => toggleCompany(company.value)}
                                    className="rounded"
                                  />
                                  <span>{company.label}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCompanies([]);
                      }}
                      className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDiscover}
                      disabled={isDiscovering || !searchQuery}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDiscovering ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm font-medium">Discovering...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {selectedCompanies.length > 0 ? 'Discover Selected Companies' : 'Discover All Companies'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              {/* Table Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Product URLs</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mockProducts.length} URL mappings being monitored
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium"
                  >
                    <Play className="w-4 h-4" />
                    Scrape All
                  </button>
                </div>
              </div>

              {/* Company Filter */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-black/5 transition-all cursor-pointer text-sm"
                    >
                      <option value="all">All Companies</option>
                      {companies.map(company => (
                        <option key={company.value} value={company.value}>
                          {company.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative w-48">
                    <select
                      value={productSortBy}
                      onChange={(e) => setProductSortBy(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-black/5 transition-all cursor-pointer text-sm"
                    >
                      <option value="name">Sort by Name</option>
                      <option value="company">Sort by Company</option>
                      <option value="price">Sort by Price</option>
                      <option value="date">Sort by Date</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                {selectedProducts.length > 0 && (
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium"
                  >
                    <Play className="w-4 h-4" />
                    Scrape Selected ({selectedProducts.length})
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Product
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Company
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Price
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        URL
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Last Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Last Checked
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Active
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mockProducts
                      .filter(product => companyFilter === 'all' || product.company === companyFilter)
                      .map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => {
                                if (selectedProducts.includes(product.id)) {
                                  setSelectedProducts(prev => prev.filter(id => id !== product.id));
                                } else {
                                  setSelectedProducts(prev => [...prev, product.id]);
                                }
                              }}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div>
                                <div className="text-sm font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">{product.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {product.company}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-green-600">
                                {product.price}
                              </span>
                              {product.oldPrice && (
                                <>
                                  <span className="text-xs text-muted-foreground line-through">
                                    {product.oldPrice}
                                  </span>
                                  <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                    {product.discount}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href="#"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {product.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {product.lastChecked}
                          </td>
                          <td className="px-6 py-4">
                            {product.active && <Check className="w-4 h-4 text-green-600" />}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                                <Play className="w-4 h-4 text-gray-600" />
                              </button>
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
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Scraped Prices</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Latest prices from all monitored retailers
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select
                      value={priceCompanyFilter}
                      onChange={(e) => setPriceCompanyFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-black/5 transition-all cursor-pointer text-sm pr-10"
                    >
                      <option value="all">All Companies</option>
                      {companies.map(company => (
                        <option key={company.value} value={company.value}>
                          {company.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={priceSortBy}
                      onChange={(e) => setPriceSortBy(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-black/5 transition-all cursor-pointer text-sm pr-10"
                    >
                      <option value="price">Sort by Price</option>
                      <option value="name">Sort by Name</option>
                      <option value="company">Sort by Company</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium">
                    <FileDown className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Price Table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                          Product
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                          Company
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                          Current Price
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                          Old Price
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                          Discount
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                          Status
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                          Last Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mockPrices
                        .filter(price => priceCompanyFilter === 'all' || price.company === priceCompanyFilter)
                        .sort((a, b) => {
                          if (priceSortBy === 'price') {
                            return parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, ''));
                          } else if (priceSortBy === 'company') {
                            return a.company.localeCompare(b.company);
                          } else {
                            return a.name.localeCompare(b.name);
                          }
                        })
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div>
                                  <div className="text-sm font-medium">{item.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {item.company}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-green-600">
                                {item.price}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {item.oldPrice ? (
                                <span className="text-sm text-muted-foreground line-through">
                                  {item.oldPrice}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {item.discount ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                                  {item.discount}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                  item.status === 'In Stock'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {item.lastUpdated}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  New Discovery
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium">
                  <RefreshCw className="w-4 h-4" />
                  Refresh All Prices
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}