
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { Document, Page, pdfjs as reactPdfJs } from 'react-pdf';
import * as pdfjs from 'pdfjs-dist';
import { Upload, ArrowLeft, Loader2, Search, FileText, Database, Settings, Box, Eye, PlusCircle, CheckCircle, Layers, ArrowRight, Component } from 'lucide-react';
import { Scene3D } from '../components/Scene3D';
import { Element, ElementType, ElementStatus, Task, TaskStatus } from '../types';

// Critical Fix: Configure Worker Globally
const workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
reactPdfJs.GlobalWorkerOptions.workerSrc = workerSrc;

interface ExtractedItem {
  id: string;
  type: 'Column' | 'Beam' | 'Footing';
  label: string;
  x: number;
  y: number;
  rotation: number; // 0 or Math.PI/2
  length?: number; // Calculated length in PDF pixels
  connected?: boolean; // If snapped to columns
}

type ComponentMode = 'Footing' | 'Column' | 'Beam';

export const DrawingUpload: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  // We need 'tasks' to check for duplicates and 'setTasks' to add new ones
  const { getProjectDetails, addDrawing, addElements, tasks, setTasks } = useProject();
  const { project, levels, elements: projectElements } = getProjectDetails(projectId || '');

  // File State
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Viewer State
  const [scale, setScale] = useState(1.0); 
  const [viewMode, setViewMode] = useState<'pdf' | '3d'>('pdf'); 

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [componentMode, setComponentMode] = useState<ComponentMode>('Column');

  // Set default level
  useEffect(() => {
    if (levels.length > 0 && !selectedLevelId) {
      setSelectedLevelId(levels[0].id);
    }
  }, [levels, selectedLevelId]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
      
      // Auto save to context
      if (projectId) {
        addDrawing({
          projectId: projectId,
          name: selectedFile.name,
          fileUrl: url
        });
      }
      
      // Reset Analysis for new file
      setExtractedItems([]);
      setAnalysisDone(false);
      setViewMode('pdf');
    }
  };

  // Algorithm: Snap Beams to Nearest Columns
  const snapBeamsToColumns = (items: ExtractedItem[]): ExtractedItem[] => {
    const cols = items.filter(i => i.type === 'Column');
    const beams = items.filter(i => i.type === 'Beam');
    const TOLERANCE = 80; // PDF Pixels (approx 1.5m at 50px/m)

    const processedBeams = beams.map(beam => {
      // 1. Try Horizontal Connection (Similar Y, Different X)
      const horizNeighbors = cols.filter(c => Math.abs(c.y - beam.y) < TOLERANCE);
      const left = horizNeighbors.filter(c => c.x < beam.x).sort((a,b) => b.x - a.x)[0]; // Closest to Left
      const right = horizNeighbors.filter(c => c.x > beam.x).sort((a,b) => a.x - b.x)[0]; // Closest to Right

      // 2. Try Vertical Connection (Similar X, Different Y)
      const vertNeighbors = cols.filter(c => Math.abs(c.x - beam.x) < TOLERANCE);
      const bottom = vertNeighbors.filter(c => c.y < beam.y).sort((a,b) => b.y - a.y)[0]; // Closest Below (y is smaller or larger depending on coord system, using relative logic)
      const top = vertNeighbors.filter(c => c.y > beam.y).sort((a,b) => a.y - b.y)[0]; // Closest Above

      // Evaluate connections
      let isHoriz = !!(left && right);
      let isVert = !!(bottom && top);

      // Decision Logic
      if (isHoriz && !isVert) {
        const length = right.x - left.x;
        const midX = (left.x + right.x) / 2;
        const midY = (left.y + right.y) / 2; // Average Y to align perfectly
        return { ...beam, x: midX, y: midY, length: length, rotation: 0, connected: true };
      }
      
      if (!isHoriz && isVert) {
        const length = Math.abs(top.y - bottom.y);
        const midX = (top.x + bottom.x) / 2;
        const midY = (top.y + bottom.y) / 2;
        return { ...beam, x: midX, y: midY, length: length, rotation: Math.PI / 2, connected: true };
      }

      if (isHoriz && isVert) {
        // Ambiguous: Choose the shorter span (Beams usually connect closest columns)
        const hDist = right.x - left.x;
        const vDist = Math.abs(top.y - bottom.y);
        if (hDist <= vDist) {
           return { ...beam, x: (left.x + right.x)/2, y: (left.y + right.y)/2, length: hDist, rotation: 0, connected: true };
        } else {
           return { ...beam, x: (top.x + bottom.x)/2, y: (top.y + bottom.y)/2, length: vDist, rotation: Math.PI/2, connected: true };
        }
      }

      // No connection found
      return { ...beam, connected: false };
    });

    return processedBeams; // Only return beams, not columns
  };

  const handleAnalyze = async () => {
    if (isAnalyzing) return;
    if (!file && !fileUrl) {
      alert("Please upload a drawing first.");
      return;
    }
    
    setIsAnalyzing(true);
    setExtractedItems([]);
    setAnalysisDone(false);

    try {
      console.log(`Starting ${componentMode} analysis...`);
      let dataToLoad: ArrayBuffer;
      if (file) {
        dataToLoad = await file.arrayBuffer();
      } else if (fileUrl) {
        const response = await fetch(fileUrl);
        dataToLoad = await response.arrayBuffer();
      } else {
        throw new Error("No data source available");
      }
      
      const loadingTask = pdfjs.getDocument(dataToLoad);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      
      if (!textContent || !textContent.items || textContent.items.length === 0) {
        throw new Error("No text content found in PDF. It might be an image scan.");
      }

      const rawItems: ExtractedItem[] = [];
      let count = 0;

      // Regex Patterns
      const footingRegex = /(?:F|P)[-]?\d+/i;
      const colRegex = /(?:C|SC)[-]?\d+/i;
      const beamRegex = /(?:[P|R|S|G]?B[-]?\d+[A-Z]?)|(?:RB\d+)|(?:SB\d+)/i;

      // Iteration Pass
      textContent.items.forEach((item: any) => {
        const text = item.str ? item.str.trim() : "";
        if (!text) return;

        const transform = item.transform; 
        const x = Math.round(transform[4]);
        const y = Math.round(transform[5]);

        switch (componentMode) {
          case 'Footing':
            if (footingRegex.test(text)) {
              rawItems.push({ id: `found-${count++}`, type: 'Footing', label: text, x, y, rotation: 0, connected: true });
            }
            break;
            
          case 'Column':
            if (colRegex.test(text)) {
              rawItems.push({ id: `found-${count++}`, type: 'Column', label: text, x, y, rotation: 0, connected: true });
            }
            break;

          case 'Beam':
            // For Beams, we grab BOTH Beams and Columns to allow for snapping
            if (beamRegex.test(text)) {
              rawItems.push({ id: `found-${count++}`, type: 'Beam', label: text, x, y, rotation: 0, connected: false });
            } else if (colRegex.test(text)) {
              // We tag these as Columns but we might not want to save them if we are in Beam mode
              // This is a temporary helper list
              rawItems.push({ id: `ref-col-${count++}`, type: 'Column', label: text, x, y, rotation: 0, connected: true });
            }
            break;
        }
      });

      let finalItems: ExtractedItem[] = [];

      if (componentMode === 'Beam') {
         // Perform snapping logic
         const snappedBeams = snapBeamsToColumns(rawItems);
         finalItems = snappedBeams; // snapBeamsToColumns only returns the processed beams
      } else {
         finalItems = rawItems;
      }

      finalItems.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

      setExtractedItems(finalItems);
      setAnalysisDone(true);
      console.log(`Success: Found ${finalItems.length} items.`);

    } catch (error: any) {
      console.error("Analysis crashed:", error);
      alert(`Failed to analyze PDF: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleRotation = (itemId: string) => {
    setExtractedItems(prev => prev.map(item => {
      if (item.id === itemId && item.type === 'Beam') {
        const newRotation = item.rotation === 0 ? Math.PI / 2 : 0;
        return { ...item, rotation: newRotation };
      }
      return item;
    }));
  };

  const handleAddToProject = () => {
    if (!projectId || !selectedLevelId) return;
    
    const selectedLevel = levels.find(l => l.id === selectedLevelId);
    if (!selectedLevel) return;

    // Convert ExtractedItems to Domain Elements with Stacking Math
    const newElements: Element[] = extractedItems.map(item => {
      let elementType = ElementType.COLUMN;
      if (item.type === 'Beam') elementType = ElementType.BEAM;
      if (item.type === 'Footing') elementType = ElementType.FOOTING;

      // Y-Position Logic based on Component Mode
      let elevationOffset = 0;
      switch (item.type) {
        case 'Footing': elevationOffset = -0.25; break; // Below ground
        case 'Column': elevationOffset = 1.5; break; // Center of 3m column
        case 'Beam': elevationOffset = 3.0; break; // Ceiling
      }

      return {
        id: `el-${Date.now()}-${item.id}`,
        projectId: projectId,
        levelId: selectedLevelId,
        type: elementType,
        label: item.label,
        gridLocation: 'TBD',
        status: ElementStatus.PENDING,
        coordinates: {
          x: item.x / 50, // Scale X
          y: selectedLevel.elevation, // Base Level Elevation (Visuals handle offset)
          z: item.y / 50  // Map PDF Y to Z (Depth)
        },
        rotation: item.rotation, // Persist orientation
        length: item.length ? item.length / 50 : undefined, // Persist Length (Scaled)
        connected: item.connected
      };
    });

    addElements(newElements);
    
    // Reset UI for next upload
    setFile(null);
    setFileUrl(null);
    setExtractedItems([]);
    setAnalysisDone(false);
    setViewMode('pdf');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    alert(`Added ${newElements.length} ${componentMode}s to ${selectedLevel.name}!`);
  };

  const handleFinish = () => {
    if (projectId) {
      if (projectElements.length === 0) {
        alert("Please add at least one drawing layer first.");
        return;
      }

      // Generate WBS Tasks explicitly
      const existingElementIds = new Set(tasks.map(t => t.elementId));
      
      const newTasks: Task[] = projectElements
        .filter(el => !existingElementIds.has(el.id))
        .map(el => ({
            id: `task-${el.id}`,
            elementId: el.id,
            name: `Cast ${el.type} ${el.label}`, 
            status: TaskStatus.TODO,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }));

      if (newTasks.length > 0) {
        setTasks(prev => [...prev, ...newTasks]);
      }

      navigate(`/dashboard/${projectId}`);
    }
  };

  // Stats for current analysis
  const itemCount = extractedItems.length;
  
  // Get selected level elevation for preview
  const currentElevation = levels.find(l => l.id === selectedLevelId)?.elevation || 0;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
      
      {/* LEFT COLUMN: Viewer (2D or 3D) */}
      <div className="flex-grow flex flex-col gap-4 bg-gray-100 rounded-xl p-4 border border-gray-200 shadow-inner overflow-hidden relative">
         {!fileUrl ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
               <Upload className="h-16 w-16 mb-4 text-gray-300" />
               <p className="text-lg font-medium">No Drawing Loaded</p>
               <p className="text-sm">Upload a PDF to begin analysis</p>
            </div>
         ) : viewMode === '3d' ? (
            <Scene3D 
              items={extractedItems} 
              baseElevation={currentElevation} 
              onItemClick={handleToggleRotation} 
            />
         ) : (
            <div className="flex-grow overflow-auto flex justify-center bg-gray-500/10 rounded-lg p-8">
               <Document
                file={fileUrl}
                loading={<div className="flex items-center gap-2 p-10"><Loader2 className="animate-spin" /> Loading PDF...</div>}
                error={<div className="p-10 text-red-500">Error loading PDF viewer.</div>}
               >
                 <Page 
                    pageNumber={1} 
                    scale={scale} 
                    className="shadow-xl"
                    renderTextLayer={true} 
                    renderAnnotationLayer={false}
                 />
               </Document>
            </div>
         )}
         
         {fileUrl && viewMode === 'pdf' && (
             <div className="flex justify-center gap-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200 w-fit mx-auto absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="text-gray-600 hover:text-blue-600 font-bold px-2">-</button>
                <span className="text-xs font-mono pt-1 text-gray-500">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="text-gray-600 hover:text-blue-600 font-bold px-2">+</button>
             </div>
         )}
      </div>

      {/* RIGHT COLUMN: Controls & Results */}
      <div className="w-full lg:w-96 flex flex-col gap-6 h-full overflow-y-auto pr-1">
        
        {/* Navigation & Inventory Summary */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
           <Link to={`/dashboard/${projectId}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 mb-4">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          
          {/* Project Inventory Sidebar */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              Staged Inventory
            </h3>
            <div className="space-y-1 max-h-32 overflow-y-auto text-sm border-l-2 border-gray-100 pl-2">
              {levels.map(lvl => {
                const count = projectElements.filter(e => e.levelId === lvl.id).length;
                return (
                  <div key={lvl.id} className="flex justify-between text-gray-600">
                    <span>{lvl.name}</span>
                    <span className={`font-medium ${count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {count} items
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-gray-100 mt-2 pt-1 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>{projectElements.length}</span>
              </div>
            </div>
          </div>

          <button
             onClick={handleFinish}
             className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Level & Upload Control */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
            {/* Level Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Select Level</label>
              <div className="relative">
                <Layers className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <select 
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {levels.map(l => (
                    <option key={l.id} value={l.id}>{l.name} (Elev: {l.elevation}m)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Component Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Component Type</label>
              <div className="relative">
                <Component className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <select 
                  value={componentMode}
                  onChange={(e) => setComponentMode(e.target.value as ComponentMode)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Footing">Footing (F# / P#)</option>
                  <option value="Column">Column (C# / SC#)</option>
                  <option value="Beam">Beam (B# / PB#)</option>
                </select>
              </div>
            </div>

            {/* File Upload */}
            <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 font-medium truncate max-w-[180px]">
                    {file ? file.name : "Upload Drawing PDF"}
                </span>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf" onChange={onFileChange} />
            </label>
            
            {/* Analyze Button */}
            <button
                onClick={handleAnalyze}
                disabled={(!fileUrl && !file) || isAnalyzing}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing {componentMode}s...
                    </>
                ) : (
                    <>
                        <Search className="h-4 w-4" />
                        Analyze {componentMode}s
                    </>
                )}
            </button>
        </div>

        {/* Results & Actions */}
        <div className="flex-grow bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            {/* View Toggle */}
            <div className="p-2 bg-gray-50 border-b border-gray-200">
               <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
                  <button
                    onClick={() => setViewMode('pdf')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                      viewMode === 'pdf' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Eye className="h-3 w-3" /> 2D
                  </button>
                  <button
                    onClick={() => setViewMode('3d')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                      viewMode === '3d' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Box className="h-3 w-3" /> 3D Preview
                  </button>
               </div>
            </div>

            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    Extracted {componentMode}s
                </h3>
                {analysisDone && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {extractedItems.length} Found
                    </span>
                )}
            </div>

            <div className="flex-grow overflow-auto p-0 relative">
                {!analysisDone ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs p-6 text-center">
                        <FileText className="h-8 w-8 mb-2 opacity-20" />
                        <p>Ready to analyze</p>
                    </div>
                ) : extractedItems.length === 0 ? (
                    <div className="p-4 text-center text-amber-600 bg-amber-50 m-2 rounded text-xs">
                        No {componentMode} elements found.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 pb-16">
                        {extractedItems.map((item) => (
                            <div key={item.id} className="grid grid-cols-3 px-4 py-2 hover:bg-gray-50 text-xs transition-colors">
                                <div className="flex items-center font-medium">
                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${item.type === 'Column' ? 'bg-indigo-500' : 
                                      (item.type === 'Beam' ? (item.connected ? 'bg-emerald-500' : 'bg-red-500') : 'bg-gray-600')}`}></span>
                                    {item.label}
                                </div>
                                <div className="text-gray-500">{item.type}</div>
                                <div className="text-right text-gray-400 font-mono">
                                    {Math.round(item.x)},{Math.round(item.y)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Floating Add Button */}
                {analysisDone && extractedItems.length > 0 && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <button
                      onClick={handleAddToProject}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="h-5 w-5" />
                      Add {extractedItems.length} Items to Project
                    </button>
                  </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
