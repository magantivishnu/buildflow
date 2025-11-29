import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { StructureType } from '../types';
import { Building2, Layers, Ruler, ArrowRight, Loader2 } from 'lucide-react';

export const ProjectSetup: React.FC = () => {
  const navigate = useNavigate();
  const { addProject } = useProject();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    structureType: StructureType.RCC_FRAMED,
    floorsAboveGround: 2,
    floorHeight: 3.0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API delay for better UX
    setTimeout(() => {
      const newProjectId = addProject({
        name: formData.name,
        structureType: formData.structureType,
        floorsAboveGround: Number(formData.floorsAboveGround),
        floorHeight: Number(formData.floorHeight),
      });
      setIsSubmitting(false);
      navigate(`/dashboard/${newProjectId}`);
    }, 800);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
        <p className="text-gray-600 mt-2">Define your building structure to automatically generate levels and grids.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Project Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">Project Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Sunset Heights Tower A"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Structure Type */}
              <div className="space-y-2">
                <label htmlFor="structureType" className="block text-sm font-semibold text-gray-700">Structure Type</label>
                <select
                  id="structureType"
                  name="structureType"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                  value={formData.structureType}
                  onChange={handleChange}
                >
                  <option value={StructureType.RCC_FRAMED}>RCC Framed Structure</option>
                  <option value={StructureType.SHEAR_WALL}>Shear Wall</option>
                  <option value={StructureType.PREFAB}>Pre-Fabricated</option>
                </select>
              </div>

              {/* Floors */}
              <div className="space-y-2">
                <label htmlFor="floorsAboveGround" className="block text-sm font-semibold text-gray-700">Floors Above Ground</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Layers className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="floorsAboveGround"
                    name="floorsAboveGround"
                    min="1"
                    max="100"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={formData.floorsAboveGround}
                    onChange={handleChange}
                  />
                </div>
                <p className="text-xs text-gray-500">Excluding Ground Floor</p>
              </div>

              {/* Floor Height */}
              <div className="space-y-2">
                <label htmlFor="floorHeight" className="block text-sm font-semibold text-gray-700">Typical Floor Height (m)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Ruler className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="floorHeight"
                    name="floorHeight"
                    min="2"
                    max="10"
                    step="0.1"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={formData.floorHeight}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Configuration Preview</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Total Levels: <span className="font-medium text-gray-900">{Number(formData.floorsAboveGround) + 1}</span> (Ground + {formData.floorsAboveGround})</li>
                <li>• Total Height: <span className="font-medium text-gray-900">{(Number(formData.floorsAboveGround) * Number(formData.floorHeight)).toFixed(2)}m</span></li>
              </ul>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Project Structure...
                  </>
                ) : (
                  <>
                    Create Project
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};