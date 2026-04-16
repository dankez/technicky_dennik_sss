import React, { useState, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, MapPin, CloudSun, Send, Trash2, Image as ImageIcon, Loader2, FileText, LogOut, Download, Archive } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { db, type DiaryEntry } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createRoot } from 'react-dom/client';
import { PdfTemplate } from './PdfTemplate';

const JASKYNIARSKE_SKUPINY = [
  "Jaskyniarska skupina Adama Vallu",
  "Moldavský jaskyniarsky klub Adonis Ten",
  "Jaskyniarska skupina Aragonit",
  "Jaskyniarska skupina Arachnos – Slovenský kras",
  "Speleoklub Badizer Ardovo",
  "Speleoklub Banská Bystrica",
  "Speleo Bratislava",
  "Speleo Brezno",
  "Speleoklub Cassovia",
  "Oblastná skupina Čachtice",
  "Speleologický klub Červené vrchy Slovakia",
  "CUC Bratislava",
  "Jaskyniarsky klub Demänovská Dolina",
  "Speleo-Detva",
  "Speleoklub Drienka Košice",
  "Jaskyniarsky klub Dubnica nad Váhom",
  "Speleoklub Ďumbier",
  "MEANDER – Hájsky klub športovej speleológie",
  "Jaskyniarsky klub Handlová",
  "Speleoclub Chočské vrchy",
  "Oblastná skupina Inovec",
  "Oblastná skupina Jána Majku",
  "Oblastná skupina Liptovská Teplička",
  "Oblastná skupina Liptovský Mikuláš",
  "Jaskyniarsky klub Liptovský Trnovec",
  "Speleoklub Malá Fatra",
  "Speleoklub Minotaurus",
  "Speleoklub Muránska planina",
  "Speleoklub Nicolaus",
  "Speleoklub Nitra",
  "Oblastná skupina Orava",
  "Jaskyniari Plavecké Podhradie",
  "Oblastná skupina Prešov",
  "Oblastná speleologická skupina Rimavská Sobota",
  "Speleoklub Rokoš",
  "Speleo Rožňava",
  "Oblastná skupina Ružomberok",
  "Speleologický klub Slovenský raj",
  "Sekcia speleopotápania",
  "Speleodiver",
  "Jaskyniarska skupina Spišská Belá",
  "Jaskyniarsky klub Strážovské vrchy",
  "Speleoklub Šariš",
  "Speleoklub Tisovec",
  "Trenčiansky speleoklub",
  "Speleoklub Tribeč",
  "Speleoklub Trnava",
  "Jaskyniarsky klub Speleo Turiec",
  "Oblastná skupina Uhrovec",
  "Speleoklub Univerzity P. J. Šafárika, Košice",
  "Jaskyniarsky klub Varín",
  "Oblastná skupina Veľká Fatra",
  "Žilinský jaskyniarsky klub"
];

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'novy' | 'moje'>('novy');
  const [currentEntryId, setCurrentEntryId] = useState<string>(uuidv4());

  const userDiaries = useLiveQuery(
    () => user ? db.diaries.where('userId').equals(user.id).reverse().sortBy('createdAt') : []
  , [user]);

  const [formData, setFormData] = useState({
    dennikCislo: '',
    skupina: '',
    datum: new Date().toISOString().split('T')[0],
    pracovnaDoba: '',
    pocasie: '',
    lokalita: '',
    poloha: '',
    krasoveUzemie: '',
    orografickyCelok: '',
    veduciAkcie: '',
    ostatniClenovia: '',
    iniUcastnici: '',
    popisPrace: '',
    vyhlbene: '',
    objavene: '',
    zamerane: '',
  });

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'skupina' && user) {
        localStorage.setItem(`defaultSkupina_${user.id}`, value);
      }
      return newData;
    });
  };

  // Restore user session and defaults
  useEffect(() => {
    const savedUser = localStorage.getItem('sssUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      const defaultSkupina = localStorage.getItem(`defaultSkupina_${parsedUser.id}`);
      if (defaultSkupina) {
        setFormData(prev => ({ ...prev, skupina: defaultSkupina }));
      }
    }
  }, []);

  // Auto-save debounced
  useEffect(() => {
    if (!user) return;
    const saveTimer = setTimeout(async () => {
      try {
        const multimediaToSave = mediaFiles.map((m: MediaFile & { arrayBuffer?: ArrayBuffer }) => ({
          id: m.id,
          name: m.file.name,
          type: m.type,
          data: m.arrayBuffer || new ArrayBuffer(0)
        }));

        await db.diaries.put({
          ...formData,
          id: currentEntryId,
          userId: user.id,
          multimedia: multimediaToSave,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Auto-save failed", error);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(saveTimer);
  }, [formData, mediaFiles, user, currentEntryId]);

  const resetForm = () => {
    setCurrentEntryId(uuidv4());
    const defaultSkupina = user ? localStorage.getItem(`defaultSkupina_${user.id}`) || '' : '';
    setFormData({
      dennikCislo: '',
      skupina: defaultSkupina,
      datum: new Date().toISOString().split('T')[0],
      pracovnaDoba: '',
      pocasie: '',
      lokalita: '',
      poloha: '',
      krasoveUzemie: '',
      orografickyCelok: '',
      veduciAkcie: '',
      ostatniClenovia: '',
      iniUcastnici: '',
      popisPrace: '',
      vyhlbene: '',
      objavene: '',
      zamerane: '',
    });
    setMediaFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo(0,0);
  };

  const handleLoginSuccess = (credentialResponse: unknown) => {
    const credRes = credentialResponse as { credential?: string };
    if (credRes.credential) {
      const decoded = jwtDecode(credRes.credential) as { sub: string; name: string; email: string; picture?: string };
      const newUser: User = {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture
      };
      setUser(newUser);
      localStorage.setItem('sssUser', JSON.stringify(newUser));

      const defaultSkupina = localStorage.getItem(`defaultSkupina_${newUser.id}`);
      if (defaultSkupina) {
        setFormData(prev => ({ ...prev, skupina: defaultSkupina }));
      }
    }
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('sssUser');
  };

  const handleGetLocationAndWeather = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolokácia nie je podporovaná vašim prehliadačom.');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, poloha: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));

        try {
          // 1. Fetch Location Name (Reverse Geocoding via Nominatim)
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
            const locName = geoData.address.village || geoData.address.town || geoData.address.city || geoData.address.municipality || '';
            const county = geoData.address.county || '';
            const displayLoc = [locName, county].filter(Boolean).join(', ');
            if (displayLoc) {
              setFormData(prev => ({ ...prev, lokalita: prev.lokalita || displayLoc }));
            }
          }

          // 2. Fetch Weather (Open-Meteo)
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
          const weatherData = await weatherRes.json();

          if (weatherData && weatherData.current) {
             const temp = weatherData.current.temperature_2m;
             const code = weatherData.current.weather_code;
             let weatherDesc = 'Neznáme';

             // Basic WMO weather codes mapping
             if (code === 0) weatherDesc = 'Jasno';
             else if (code >= 1 && code <= 3) weatherDesc = 'Polojasno / Oblačno';
             else if (code >= 45 && code <= 48) weatherDesc = 'Hmla';
             else if (code >= 51 && code <= 67) weatherDesc = 'Dážď / Mrholenie';
             else if (code >= 71 && code <= 77) weatherDesc = 'Sneh';
             else if (code >= 80 && code <= 82) weatherDesc = 'Prehánky';
             else if (code >= 95) weatherDesc = 'Búrka';

             setFormData(prev => ({
               ...prev,
               pocasie: prev.pocasie || `${weatherDesc}, ${temp}°C`
             }));
          }

        } catch (error) {
          console.error("Error fetching location/weather details:", error);
          setLocationError('Nepodarilo sa načítať detaily polohy a počasia.');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        setLocationError('Nepodarilo sa získať polohu. Skontrolujte povolenia.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsCompressing(true);
      const newFiles = Array.from(e.target.files);
      const processedFiles: MediaFile[] = [];

      for (const file of newFiles) {
        if (file.type.startsWith('image/')) {
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              fileType: 'image/webp'
            };

            const compressedFile = await imageCompression(file, options);
            const webpFile = new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp'
            });
            const arrayBuffer = await webpFile.arrayBuffer();

            processedFiles.push({
              id: Math.random().toString(36).substr(2, 9),
              file: webpFile,
              preview: URL.createObjectURL(webpFile),
              type: 'image/webp',
              arrayBuffer // Store array buffer eagerly
            } as MediaFile & { arrayBuffer: ArrayBuffer });
          } catch (error) {
            console.error('Error compressing image:', error);
            const arrayBuffer = await file.arrayBuffer();
            // Fallback to original
             processedFiles.push({
              id: Math.random().toString(36).substr(2, 9),
              file: file,
              preview: URL.createObjectURL(file),
              type: file.type,
              arrayBuffer
            } as MediaFile & { arrayBuffer: ArrayBuffer });
          }
        } else if (file.type.startsWith('video/')) {
          const arrayBuffer = await file.arrayBuffer();
          processedFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            preview: '',
            type: file.type,
            arrayBuffer
          } as MediaFile & { arrayBuffer: ArrayBuffer });
        }
      }

      setMediaFiles(prev => [...prev, ...processedFiles]);
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setMediaFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Data is auto-saved. Just reset for a new one.
    alert('Dáta sú uložené.');
    resetForm();
    setActiveTab('moje');
  };

  const generatePDFBlob = async (diaryData: DiaryEntry): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const opt = {
        margin:       10,
        filename:     `dennik-${diaryData.dennikCislo.replace(/\//g, '_') || diaryData.id}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      // Create object URLs for saved ArrayBuffers
      const mediaPreviews = (diaryData.multimedia || [])
        .filter(m => m.type.startsWith('image/'))
        .map(m => {
          const blob = new Blob([m.data], { type: m.type });
          return { id: m.id, preview: URL.createObjectURL(blob) };
        });

      const tempDiv = document.createElement('div');
      document.body.appendChild(tempDiv);
      const root = createRoot(tempDiv);

      root.render(<PdfTemplate diary={diaryData} mediaPreviews={mediaPreviews} />);

      // Give React a tick to render
      setTimeout(() => {
        const element = tempDiv.firstChild as HTMLElement;
        html2pdf().set(opt).from(element).output('blob').then((blob: Blob) => {
           // Cleanup object URLs to avoid memory leaks
           mediaPreviews.forEach(m => URL.revokeObjectURL(m.preview));
           root.unmount();
           tempDiv.remove();
           resolve(blob);
        }).catch((err: Error) => {
           mediaPreviews.forEach(m => URL.revokeObjectURL(m.preview));
           root.unmount();
           tempDiv.remove();
           reject(err);
        });
      }, 100);
    });
  };

  const handleExportPDF = async () => {
    try {
      // Mock a DiaryEntry structure from current form data for the template
      const currentDiaryData: DiaryEntry = {
        id: currentEntryId,
        userId: user?.id || '',
        ...formData,
        multimedia: [], // We pass the previews directly for the current form to avoid ArrayBuffer conversion here
        createdAt: new Date().toISOString()
      };

      const mediaPreviews = mediaFiles
        .filter(m => m.type === 'image')
        .map(m => ({ id: m.id, preview: m.preview }));

      const opt = {
        margin:       10,
        filename:     `dennik-${formData.dennikCislo.replace(/\//g, '_') || 'novy'}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      const tempDiv = document.createElement('div');
      document.body.appendChild(tempDiv);
      const root = createRoot(tempDiv);
      root.render(<PdfTemplate diary={currentDiaryData} mediaPreviews={mediaPreviews} />);

      setTimeout(() => {
        const element = tempDiv.firstChild as HTMLElement;
        html2pdf().set(opt).from(element).save().then(() => {
          root.unmount();
          tempDiv.remove();
        });
      }, 100);
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleExportSinglePastPDF = async (diary: DiaryEntry) => {
    const blob = await generatePDFBlob(diary);
    saveAs(blob, `dennik-${diary.dennikCislo.replace(/\//g, '_') || diary.id}.pdf`);
  };

  const handleDownloadAllZip = async () => {
    if (!userDiaries || userDiaries.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder("denniky");
    if (!folder) return;

    for (const diary of userDiaries) {
       try {
         const blob = await generatePDFBlob(diary);
         folder.file(`dennik-${diary.dennikCislo.replace(/\//g, '_') || diary.id}.pdf`, blob);
       } catch {
         console.error("Failed to generate PDF for", diary.id);
       }
    }

    zip.generateAsync({ type: "blob" }).then((content: Blob) => {
      saveAs(content, "vsetky_denniky.zip");
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
           <div className="bg-blue-800 text-white p-4 rounded-lg -mt-4 mx-auto w-3/4 shadow-md">
             <h1 className="text-xl font-bold">Technický denník SSS</h1>
           </div>
           <p className="text-gray-600">Pre vytvorenie a správu technických denníkov sa prosím prihláste.</p>
           <div className="flex justify-center pt-4">
             <GoogleLogin
               onSuccess={handleLoginSuccess}
               onError={() => console.log('Login Failed')}
               useOneTap
             />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-12 font-sans">
      {/* Top Navigation Bar */}
      <nav className="bg-blue-800 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
             {user.picture && <img src={user.picture} alt="Profil" className="w-8 h-8 rounded-full" />}
             <div>
               <p className="text-sm font-bold leading-tight">{user.name}</p>
               <p className="text-xs text-blue-200">{user.email}</p>
             </div>
          </div>
          <button onClick={handleLogout} className="text-blue-200 hover:text-white transition-colors" title="Odhlásiť sa">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab('novy')}
            className={`flex-1 py-3 text-center font-medium border-b-4 transition-colors ${activeTab === 'novy' ? 'border-white bg-blue-700' : 'border-transparent text-blue-200 hover:bg-blue-700/50'}`}
          >
            Nový denník
          </button>
          <button
            onClick={() => setActiveTab('moje')}
            className={`flex-1 py-3 text-center font-medium border-b-4 transition-colors ${activeTab === 'moje' ? 'border-white bg-blue-700' : 'border-transparent text-blue-200 hover:bg-blue-700/50'}`}
          >
            Moje denníky ({userDiaries?.length || 0})
          </button>
        </div>
      </nav>

      {activeTab === 'moje' ? (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold text-gray-800">Uložené denníky</h2>
             {userDiaries && userDiaries.length > 0 && (
               <button onClick={handleDownloadAllZip} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                 <Archive className="w-4 h-4" />
                 Stiahnuť všetky (ZIP)
               </button>
             )}
           </div>

           {userDiaries?.length === 0 ? (
             <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-200">
               <p className="text-gray-500">Zatiaľ nemáte uložené žiadne denníky.</p>
               <button onClick={() => setActiveTab('novy')} className="mt-4 text-blue-600 font-medium hover:underline">Vytvoriť prvý denník</button>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {userDiaries?.map((diary) => (
                 <div key={diary.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-3">
                     <div>
                       <h3 className="font-bold text-lg text-blue-900">{diary.dennikCislo || 'Bez čísla'}</h3>
                       <p className="text-sm text-gray-600">{diary.lokalita || 'Neznáma lokalita'}</p>
                     </div>
                     <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{diary.datum}</span>
                   </div>
                   <p className="text-sm text-gray-500 mb-4 line-clamp-2">{diary.popisPrace || 'Bez popisu.'}</p>
                   <div className="flex justify-between items-center border-t pt-3">
                     <span className="text-xs text-gray-400">Prílohy: {diary.multimedia?.length || 0}</span>
                     <button onClick={() => handleExportSinglePastPDF(diary)} className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-medium text-sm transition-colors">
                       <Download className="w-4 h-4" />
                       Stiahnuť PDF
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      ) : (
      <div className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden relative">

          <div className="absolute top-2 right-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded shadow-sm opacity-70">
            Automatické ukladanie aktívne
          </div>

        {/* Header */}
        <div className="bg-blue-800 text-white p-6 pt-8">
          <h1 className="text-2xl font-bold text-center">Technický denník</h1>
          <p className="text-blue-200 text-center text-sm mt-1">Slovenská Speleologická Spoločnosť</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* Základné info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Základné informácie</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dennikCislo" className="block text-sm font-medium text-gray-700 mb-1">Denník č.</label>
                <input type="text" id="dennikCislo" name="dennikCislo" value={formData.dennikCislo} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" placeholder="/202_" />
              </div>
              <div>
                <label htmlFor="datum" className="block text-sm font-medium text-gray-700 mb-1">Dátum</label>
                <input type="date" id="datum" name="datum" value={formData.datum} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
              <div>
                <label htmlFor="skupina" className="block text-sm font-medium text-gray-700 mb-1">Jaskyniarska skupina</label>
                <select id="skupina" name="skupina" value={formData.skupina} onChange={(e) => handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white">
                  <option value="">-- Vyberte skupinu --</option>
                  {JASKYNIARSKE_SKUPINY.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pracovnaDoba" className="block text-sm font-medium text-gray-700 mb-1">Pracovná doba</label>
                <input type="text" id="pracovnaDoba" name="pracovnaDoba" value={formData.pracovnaDoba} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" placeholder="napr. 09:00 - 16:00" />
              </div>
            </div>
          </section>

          {/* Autovyplnenie Polohy a Počasia */}
          <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
               <div>
                 <h3 className="text-md font-semibold text-blue-900">Automatické zistenie polohy a počasia</h3>
                 <p className="text-xs text-blue-700 mt-1">Zistí GPS súradnice, názov lokality a aktuálne počasie.</p>
               </div>
               <button
                 type="button"
                 onClick={handleGetLocationAndWeather}
                 disabled={isLocating}
                 className="mt-3 sm:mt-0 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-70"
               >
                 {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                 {isLocating ? 'Zisťujem...' : 'Zistiť polohu'}
               </button>
             </div>
             {locationError && <p className="text-red-500 text-sm mb-2">{locationError}</p>}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label htmlFor="poloha" className="block text-sm font-medium text-gray-700 mb-1">Poloha lokality (GPS)</label>
                  <input type="text" id="poloha" name="poloha" value={formData.poloha} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white" placeholder="Súradnice" />
                </div>
                <div>
                  <label htmlFor="pocasie" className="block text-sm font-medium text-gray-700 mb-1">Počasie počas akcie</label>
                  <div className="relative">
                    <CloudSun className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input type="text" id="pocasie" name="pocasie" value={formData.pocasie} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 pl-10 border bg-white" placeholder="Teplota a stav oblohy" />
                  </div>
                </div>
             </div>
          </section>

          {/* Lokalita */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Lokalita</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="lokalita" className="block text-sm font-medium text-gray-700 mb-1">Názov lokality / Jaskyne</label>
                <input type="text" id="lokalita" name="lokalita" value={formData.lokalita} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="krasoveUzemie" className="block text-sm font-medium text-gray-700 mb-1">Krasové územie</label>
                  <input type="text" id="krasoveUzemie" name="krasoveUzemie" value={formData.krasoveUzemie} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
                </div>
                <div>
                  <label htmlFor="orografickyCelok" className="block text-sm font-medium text-gray-700 mb-1">Orografický celok</label>
                  <input type="text" id="orografickyCelok" name="orografickyCelok" value={formData.orografickyCelok} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
                </div>
              </div>
            </div>
          </section>

          {/* Účastníci */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Účastníci</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="veduciAkcie" className="block text-sm font-medium text-gray-700 mb-1">Vedúci akcie</label>
                <input type="text" id="veduciAkcie" name="veduciAkcie" value={formData.veduciAkcie} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
              <div className="md:row-span-2">
                <label htmlFor="ostatniClenovia" className="block text-sm font-medium text-gray-700 mb-1">Ostatní členovia SSS</label>
                <textarea id="ostatniClenovia" name="ostatniClenovia" value={formData.ostatniClenovia} onChange={handleChange} rows={4} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border resize-none"></textarea>
              </div>
              <div>
                <label htmlFor="iniUcastnici" className="block text-sm font-medium text-gray-700 mb-1">Iní účastníci</label>
                <input type="text" id="iniUcastnici" name="iniUcastnici" value={formData.iniUcastnici} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
            </div>
          </section>

          {/* Práca */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Popis a výsledky</h2>
            <div>
              <label htmlFor="popisPrace" className="block text-sm font-medium text-gray-700 mb-1">Popis práce (prípadný nákres)</label>
              <textarea id="popisPrace" name="popisPrace" value={formData.popisPrace} onChange={handleChange} rows={6} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
              <div>
                <label htmlFor="vyhlbene" className="block text-sm font-medium text-gray-700 mb-1">Vyhĺbené [m]</label>
                <input type="text" id="vyhlbene" name="vyhlbene" value={formData.vyhlbene} onChange={handleChange} placeholder="dĺžka, hĺbka" className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
              <div>
                <label htmlFor="objavene" className="block text-sm font-medium text-gray-700 mb-1">Objavené [m]</label>
                <input type="text" id="objavene" name="objavene" value={formData.objavene} onChange={handleChange} placeholder="dĺžka, hĺbka" className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
              <div>
                <label htmlFor="zamerane" className="block text-sm font-medium text-gray-700 mb-1">Zamerané [m]</label>
                <input type="text" id="zamerane" name="zamerane" value={formData.zamerane} onChange={handleChange} placeholder="dĺžka, hĺbka" className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
              </div>
            </div>
          </section>

          {/* Multimédiá */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center justify-between">
              <span>Multimédiá</span>
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Automatická kompresia (WebP)</span>
            </h2>

            <div className="flex flex-col items-start gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="flex items-center gap-2 bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 px-6 py-4 rounded-lg w-full justify-center transition-colors disabled:opacity-50"
              >
                {isCompressing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                <span className="font-medium">{isCompressing ? 'Spracovávam...' : 'Pridať fotky / videá'}</span>
              </button>

              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full mt-4">
                  {mediaFiles.map((media) => (
                    <div key={media.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center">
                      {media.type === 'image' && media.preview ? (
                        <img src={media.preview} alt="Náhľad" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <span className="text-xs truncate max-w-full px-2">{media.file.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(media.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Odstrániť"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Akcie */}
          <div className="pt-6 pb-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t mt-4">
            <button type="button" onClick={handleExportPDF} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md md:col-span-1">
              <FileText className="w-5 h-5" />
              Aktuálny do PDF
            </button>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md md:col-span-1">
              <Send className="w-5 h-5" />
              Nový denník
            </button>
          </div>

        </form>
        </div>
      </div>
      )}

    </div>
  );
}

export default App;
