import React from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { ArrowRight, Building, Plus } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { projects } = useProject();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Modern Construction <br className="hidden md:block" />
          <span className="text-blue-600">Management Simplified</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-600">
          Track projects, manage structural elements, and visualize progress in real-time. 
          Built for engineers, by engineers.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="h-5 w-5" />
            Create New Project
          </Link>
        </div>
      </section>

      {/* Projects Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {projects.length} Active
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first project.</p>
            <Link to="/setup" className="text-blue-600 font-medium hover:text-blue-700 hover:underline">
              Create Project &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/dashboard/${project.id}`}
                className="group block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {project.structureType.replace('_', ' ')}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {project.name}
                </h3>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Floors:</span>
                    <span className="font-medium text-gray-900">{project.floorsAboveGround + 1} (G + {project.floorsAboveGround})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Floor Height:</span>
                    <span className="font-medium text-gray-900">{project.floorHeight}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-blue-600 font-medium text-sm gap-1 group-hover:gap-2 transition-all">
                  View Dashboard <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};