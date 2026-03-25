import { AppSidebar } from '../components/app-sidebar';
import { Building2, RefreshCw, Plus, Play, Edit, Trash2, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

export function Companies() {
  const [showAddModal, setShowAddModal] = useState(false);

  const companies = [
    {
      id: 1,
      name: 'Amazon AE',
      slug: 'amazon-ae',
      baseUrl: 'https://www.amazon.ae',
      status: 'Active'
    },
    {
      id: 2,
      name: 'Bin Sina Pharmacy',
      slug: 'bin-sina',
      baseUrl: 'https://www.binsina.ae',
      status: 'Active'
    },
    {
      id: 3,
      name: 'Carrefour UAE',
      slug: 'carrefour-uae',
      baseUrl: 'https://www.carrefouruae.com',
      status: 'Active'
    },
    {
      id: 4,
      name: 'Chemist Warehouse',
      slug: 'chemist-warehouse',
      baseUrl: 'https://www.chemistwarehouse.ae',
      status: 'Active'
    },
    {
      id: 5,
      name: 'Dr.Nutrition',
      slug: 'dr-nutrition',
      baseUrl: 'https://www.drnutrition.com',
      status: 'Active'
    },
    {
      id: 6,
      name: 'Grandiose',
      slug: 'grandiose',
      baseUrl: 'https://www.grandiose.ae',
      status: 'Active'
    },
    {
      id: 7,
      name: 'Health First',
      slug: 'health-first',
      baseUrl: 'https://www.healthfirst.ae',
      status: 'Active'
    },
    {
      id: 8,
      name: 'Life Pharmacy',
      slug: 'life-pharmacy',
      baseUrl: 'https://www.lifepharmacy.com',
      status: 'Active'
    },
    {
      id: 9,
      name: 'Med7 Online',
      slug: 'med7',
      baseUrl: 'https://www.med7online.com',
      status: 'Active'
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Companies</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {companies.length} marketplaces configured
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:bg-white rounded-lg transition-colors border border-gray-200">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                Add Company
              </button>
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Company
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Slug
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Base URL
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium">{company.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground font-mono">
                        {company.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={company.baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {company.baseUrl}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {company.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Test">
                          <Play className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Company Modal */}
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
                    <h2 className="text-xl font-semibold">Add Company</h2>
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
                        Company Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="Enter company name"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Slug
                      </label>
                      <input 
                        type="text" 
                        placeholder="company-slug"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base URL
                      </label>
                      <input 
                        type="url" 
                        placeholder="https://www.example.com"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm">
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
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
                        Add Company
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}