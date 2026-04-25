import React, { useState } from 'react';
import { 
  Activity, 
  Settings, 
  Wrench, 
  Zap, 
  Car, 
  Truck, 
  Tractor,
  ShieldAlert,
  Search,
  Cpu,
  Loader2
} from 'lucide-react';
import { cn } from './lib/utils';
import { analyzeDTC } from './lib/gemini';

type VehicleCategory = 'light' | 'heavy' | 'equipment';

interface VehicleContext {
  type: VehicleCategory;
  brand: string;
  model: string;
  year: string;
}

interface DiagnosisResult {
  code: string;
  description: string;
  top_causes: { item: string; probability: number }[];
  symptoms: string[];
  fixes: string[];
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dtc' | 'fuses' | 'admin'>('dtc');
  const [vehicle, setVehicle] = useState<VehicleContext>({
    type: 'light',
    brand: 'Toyota',
    model: 'Tacoma',
    year: '2020'
  });

  return (
    <div className="flex h-screen bg-[#0A0C10] text-slate-300 font-sans selection:bg-orange-500 selection:text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#0F1117] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight uppercase text-sm leading-tight">Auto Mechanic Buddy</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 px-3 pb-2">Diagnostics</div>
          <NavItem 
            icon={<Activity size={18} />} 
            label="DTC Lookup" 
            isActive={activeTab === 'dtc'} 
            onClick={() => setActiveTab('dtc')} 
          />
          <NavItem 
            icon={<Zap size={18} />} 
            label="Fuse Box Maps" 
            isActive={activeTab === 'fuses'} 
            onClick={() => setActiveTab('fuses')} 
          />
          <div className="pt-4 mt-4 border-t border-slate-800">
            <NavItem 
              icon={<Settings size={18} />} 
              label="System Admin" 
              isActive={activeTab === 'admin'} 
              onClick={() => setActiveTab('admin')} 
            />
          </div>

          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 px-3 pt-6 pb-2">Vehicle Profile</div>
          <div className="px-3 py-4 bg-[#161B22] rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400 mb-1 uppercase">Selected Fleet</div>
            <div className="text-sm font-semibold text-white">{vehicle.year} {vehicle.brand} {vehicle.model}</div>
            <div className="text-[10px] text-orange-400 mt-2 flex items-center gap-1 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> {vehicle.type} Vehicle Mode
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-mono">SYS_ONLINE: 1.0.4</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-[#0A0C10]">
        {/* Top Header Mobile */}
        <header className="md:hidden flex items-center px-6 h-16 border-b border-slate-800 bg-[#0F1117] justify-between">
           <Cpu className="w-6 h-6 text-orange-500 mr-3" />
           <h1 className="font-bold text-lg tracking-tight text-white uppercase">Auto Mechanic Buddy</h1>
        </header>

        {/* Global Desktop Header */}
        <header className="hidden md:flex flex-shrink-0 h-16 border-b border-slate-800 items-center px-8 justify-between bg-[#0A0C10]">
          <div className="flex items-center flex-1 max-w-xl">
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 uppercase">Workshop Status</span>
              <span className="text-sm text-white font-medium">Main Garage — Bay 04</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold">JS</div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          {activeTab === 'dtc' && <DTCAnalyzer vehicle={vehicle} onChangeVehicle={setVehicle} />}
          {activeTab === 'fuses' && <FuseBoxViewer vehicle={vehicle} />}
          {activeTab === 'admin' && <AdminPanel />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors text-sm",
        isActive 
          ? "bg-slate-800 text-white" 
          : "text-slate-300 hover:bg-slate-800/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DTCAnalyzer({ vehicle, onChangeVehicle }: { vehicle: VehicleContext, onChangeVehicle: (v: VehicleContext) => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    try {
      const res = await analyzeDTC(code, vehicle.type, vehicle.brand, vehicle.model, vehicle.year);
      setResult(res as DiagnosisResult);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze DTC.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hidden legacy header just in case, sleek makes it invisible or re-layout, but I'll keep it inline for mobile */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
          <h2 className="italic text-xs text-slate-500 uppercase tracking-widest mb-1">Module Active</h2>
          <h1 className="text-2xl font-bold tracking-tight text-white">DTC Diagnostic Intelligence</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Panel */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          <div className="bg-[#0F1117] rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vehicle Parameters</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase mb-1 block font-bold tracking-widest">Category</label>
                <select 
                  value={vehicle.type}
                  onChange={(e) => onChangeVehicle({...vehicle, type: e.target.value as VehicleCategory})}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                >
                  <option value="light">Light Vehicle</option>
                  <option value="heavy">Heavy Truck</option>
                  <option value="equipment">Heavy Equipment</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase mb-1 block font-bold tracking-widest">Brand</label>
                  <input 
                    type="text" 
                    value={vehicle.brand}
                    onChange={(e) => onChangeVehicle({...vehicle, brand: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase mb-1 block font-bold tracking-widest">Year</label>
                  <input 
                    type="text" 
                    value={vehicle.year}
                    onChange={(e) => onChangeVehicle({...vehicle, year: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase mb-1 block font-bold tracking-widest">Model</label>
                <input 
                  type="text" 
                  value={vehicle.model}
                  onChange={(e) => onChangeVehicle({...vehicle, model: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="bg-[#0F1117] rounded-xl border border-slate-800 overflow-hidden relative">
            <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fault Input</h3>
              <ShieldAlert className="w-4 h-4 text-slate-500" />
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase mb-1 block font-bold tracking-widest">DTC Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. P0300, J1939"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 font-mono text-lg font-bold text-white focus:border-orange-500 outline-none tracking-widest uppercase placeholder:normal-case placeholder:text-slate-500"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'ANALYZING...' : 'RUN DIAGNOSTIC'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Panel */}
        <div className="col-span-1 lg:col-span-8">
          {loading ? (
             <div className="bg-[#0F1117] p-10 rounded-xl border border-slate-800 h-full flex flex-col items-center justify-center text-slate-500">
               <div className="w-16 h-16 border-4 border-slate-800 border-t-orange-500 rounded-full animate-spin mb-4"></div>
               <div className="font-mono text-sm tracking-widest uppercase animate-pulse">Running AI Logic Engine...</div>
               <div className="text-xs mt-2 opacity-50">Cross-referencing {vehicle.brand} datasets</div>
             </div>
          ) : result ? (
             <div className="flex flex-col gap-6 h-full">
               {/* Top Alert Banner */}
               <div className={cn(
                 "border p-4 rounded-lg flex items-center gap-6",
                 result.severity === 'critical' ? "bg-red-950/20 border-red-500/30" :
                 result.severity === 'high' ? "bg-orange-950/20 border-orange-500/30" :
                 result.severity === 'medium' ? "bg-yellow-950/20 border-yellow-500/30" :
                 "bg-blue-950/20 border-blue-500/30"
               )}>
                 <div className={cn(
                   "flex-shrink-0 w-12 h-12 rounded flex items-center justify-center",
                   result.severity === 'critical' ? "bg-red-500/20 text-red-500" :
                   result.severity === 'high' ? "bg-orange-500/20 text-orange-500" :
                   result.severity === 'medium' ? "bg-yellow-500/20 text-yellow-500" :
                   "bg-blue-500/20 text-blue-500"
                 )}>
                   <ShieldAlert size={28} />
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center gap-3">
                     <h1 className="text-2xl font-bold text-white tracking-tight">{result.code}</h1>
                     <span className={cn(
                       "px-2 py-0.5 text-white text-[10px] font-bold uppercase rounded",
                       result.severity === 'critical' ? "bg-red-500" :
                       result.severity === 'high' ? "bg-orange-500" :
                       result.severity === 'medium' ? "bg-yellow-500" :
                       "bg-blue-500"
                     )}>
                       {result.severity} Risk
                     </span>
                   </div>
                   <p className="text-slate-400 mt-1 uppercase text-xs font-semibold tracking-wide italic">{result.description}</p>
                 </div>
                 <div className="text-right">
                   <div className="text-[10px] text-slate-500 uppercase font-bold">Confidence</div>
                   <div className="text-3xl font-mono font-bold text-emerald-400">{(result.confidence * 100).toFixed(0)}%</div>
                 </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                 {/* Left Column: Causes & Ranking */}
                 <div className="space-y-6">
                   <div className="bg-[#0F1117] border border-slate-800 rounded-xl overflow-hidden">
                     <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800 flex justify-between items-center">
                       <h3 className="text-sm font-bold text-white uppercase tracking-wider">Most Likely Causes</h3>
                       <span className="text-[10px] font-mono text-slate-500">SORTED BY PROBABILITY</span>
                     </div>
                     <div className="divide-y divide-slate-800">
                       {result.top_causes.map((cause, i) => (
                         <div key={i} className="px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3 group hover:bg-slate-800/20 cursor-default transition-colors">
                           <div className="flex items-center gap-4">
                             <span className="text-lg font-mono text-slate-600">0{i+1}.</span>
                             <span className="text-white text-sm font-medium">{cause.item}</span>
                           </div>
                           <div className="flex items-center gap-4 xl:w-auto xl:ml-auto">
                             <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-orange-500" style={{ width: `${cause.probability * 100}%` }}></div>
                             </div>
                             <span className="text-sm font-mono text-orange-500 w-10 text-right">{(cause.probability * 100).toFixed(0)}%</span>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="bg-[#0F1117] border border-slate-800 p-5 rounded-xl">
                       <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Driver Symptoms</h4>
                       <ul className="space-y-2">
                         {result.symptoms.map((sym, i) => (
                           <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                               <span className="w-1 h-1 rounded-full bg-red-500"></span> {sym}
                           </li>
                         ))}
                       </ul>
                   </div>
                 </div>

                 {/* Right Column: Fixes & Procedures */}
                 <div className="bg-[#0F1117] border border-slate-800 rounded-xl p-6 flex flex-col items-start w-full">
                   <div className="flex items-center gap-2 mb-4">
                     <Wrench className="w-5 h-5 text-emerald-500" />
                     <h3 className="text-sm font-bold text-white uppercase tracking-wider">Repair Guidance</h3>
                   </div>
                   <div className="space-y-4 w-full">
                     {result.fixes.map((fix, i) => (
                       <div key={i} className="p-3 bg-slate-800/40 border-l-2 border-emerald-500 rounded flex gap-4">
                           <div className="text-xs font-mono text-emerald-500 mt-0.5 whitespace-nowrap">STEP {i+1}</div>
                           <div className="text-sm text-slate-300 leading-relaxed">{fix}</div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             </div>
          ) : (
            <div className="bg-[#0F1117] p-10 rounded-xl border border-slate-800 h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
               <ShieldAlert size={48} className="mb-4" />
               <div className="text-lg text-white">No Diagnostic Data</div>
               <div className="text-sm mt-1">Enter a DTC code and vehicle parameters to begin.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FuseBoxViewer({ vehicle }: { vehicle: VehicleContext }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const { explainFuseBox } = await import('./lib/gemini');
      const res = await explainFuseBox(vehicle.brand, vehicle.model, vehicle.year, query);
      setResult(res);
    } catch (err) {
      console.error(err);
      alert("Failed to query fuse box data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
          <h2 className="italic text-xs text-slate-500 uppercase tracking-widest mb-1">Module Active</h2>
          <h1 className="text-2xl font-bold tracking-tight text-white">Electrical & Fuse Systems</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <form onSubmit={handleSearch} className="bg-[#0F1117] p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden">
             <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">Electrical Query</h3>
             <div className="space-y-4 relative z-10">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 block">Symptom / Component</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Radio not working, Fuel Pump Relay"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 font-sans text-sm text-white focus:border-orange-500 outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? 'PULLING SCHEMATICS...' : 'QUERY SYSTEM'}
                </button>
             </div>
          </form>
        </div>

        <div className="col-span-1 md:col-span-2">
           {loading ? (
             <div className="bg-[#0F1117] p-10 rounded-xl border border-slate-800 h-full flex flex-col items-center justify-center text-slate-500">
               <Zap className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
               <div className="font-mono text-sm tracking-widest uppercase">Scanning Electrical Diagrams...</div>
             </div>
           ) : result ? (
             <div className="bg-[#0F1117] rounded-xl border border-slate-800 p-6 space-y-6">
               <div className="border-b border-slate-800 pb-4">
                 <h2 className="text-xl font-bold text-white mb-2">Diagnostic Result</h2>
                 <div className="inline-block bg-slate-900 border border-slate-700 font-mono text-xs px-3 py-1 rounded text-orange-500 uppercase tracking-widest">
                   {result.location}
                 </div>
               </div>
               
               <p className="text-slate-300 leading-relaxed text-sm">
                 {result.diagramExplanation}
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                 <div>
                   <h3 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-3">Common Issues</h3>
                   <ul className="space-y-2">
                     {result.commonIssues?.map((issue: string, i: number) => (
                       <li key={i} className="text-sm flex gap-2"><span className="text-orange-500">•</span> {issue}</li>
                     ))}
                   </ul>
                 </div>
                 <div>
                   <h3 className="font-mono text-xs text-red-500 uppercase tracking-widest mb-3">Safety Warnings</h3>
                   <ul className="space-y-2">
                     {result.safetyWarnings?.map((warning: string, i: number) => (
                       <li key={i} className="text-sm text-red-400 flex gap-2"><ShieldAlert size={14} className="mt-0.5 text-red-500 flex-shrink-0" /> {warning}</li>
                     ))}
                   </ul>
                 </div>
               </div>
             </div>
           ) : (
             <div className="bg-[#0F1117] p-10 rounded-xl border border-slate-800 h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
               <Zap size={48} className="mb-4" />
               <div className="text-lg text-white">No Schematic Queried</div>
               <div className="text-sm mt-1">Enter a component or symptom to pull fuse/relay info.</div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function AdminPanel() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
          <h2 className="italic text-xs text-slate-500 uppercase tracking-widest mb-1">Module Active</h2>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Admin</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0F1117] p-6 rounded-xl border border-slate-800">
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">Subscription Monitor</h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-sm">Trial Users</span>
                <span className="font-mono font-medium text-white">1,204</span>
             </div>
             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-sm">Starter Plans</span>
                <span className="font-mono font-medium text-white">430</span>
             </div>
             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-sm">Pro Plans</span>
                <span className="font-mono font-medium text-white">89</span>
             </div>
             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-sm">Elite API</span>
                <span className="font-mono font-medium text-white">12</span>
             </div>
          </div>
        </div>

        <div className="bg-[#0F1117] p-6 rounded-xl border border-slate-800">
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">Dataset Coverage</h3>
          <div className="space-y-4">
             <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 uppercase font-bold tracking-wider">Engine Systems</span>
                  <span className="font-mono text-emerald-400">100%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-full"></div>
                </div>
             </div>
             <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 uppercase font-bold tracking-wider">Transmission</span>
                  <span className="font-mono text-lime-400">85%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-lime-500 w-[85%]"></div>
                </div>
             </div>
             <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 uppercase font-bold tracking-wider">Heavy Duty (J1939)</span>
                  <span className="font-mono text-orange-400">60%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-orange-500 w-[60%]"></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
