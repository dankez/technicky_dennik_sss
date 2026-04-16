import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, MapPin, CloudSun, Send, Trash2, Image as ImageIcon, Loader2, FileText } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { db } from './db';

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

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: string;
}

function App() {
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
    setFormData(prev => ({ ...prev, [name]: value }));
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

            processedFiles.push({
              id: Math.random().toString(36).substr(2, 9),
              file: webpFile,
              preview: URL.createObjectURL(webpFile),
              type: 'image'
            });
          } catch (error) {
            console.error('Error compressing image:', error);
            // Fallback to original
             processedFiles.push({
              id: Math.random().toString(36).substr(2, 9),
              file: file,
              preview: URL.createObjectURL(file),
              type: 'image'
            });
          }
        } else if (file.type.startsWith('video/')) {
          processedFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            preview: '', // Videos don't get simple previews here without more complex setup
            type: 'video'
          });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert media files to ArrayBuffers for storage
      const multimediaToSave = await Promise.all(
        mediaFiles.map(async (m) => {
          const arrayBuffer = await m.file.arrayBuffer();
          return {
            id: m.id,
            name: m.file.name,
            type: m.type,
            data: arrayBuffer
          };
        })
      );

      await db.diaries.add({
        ...formData,
        multimedia: multimediaToSave,
        createdAt: new Date().toISOString()
      });

      alert('Dáta boli úspešne uložené do lokálnej databázy. Môžete si stiahnuť PDF.');
    } catch (error) {
      console.error('Chyba pri ukladaní do DB:', error);
      alert('Vyskytla sa chyba pri ukladaní do databázy.');
    }
  };


  const handleExportPDF = () => {
    const element = document.getElementById('pdf-export-container');
    if (!element) return;

    // Temporarily show the element for rendering
    element.style.display = 'block';

    const opt = {
      margin:       10,
      filename:     `dennik-${formData.dennikCislo.replace('/', '_') || 'novy'}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
       // Hide it again
       element.style.display = 'none';
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-blue-800 text-white p-6">
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
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md md:col-span-1">
              <Send className="w-5 h-5" />
              Uložiť do lokálnej DB
            </button>
            <button type="button" onClick={handleExportPDF} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md md:col-span-1">
              <FileText className="w-5 h-5" />
              Stiahnuť PDF
            </button>
          </div>

        </form>
      </div>

      {/* Hidden PDF Template */}
      <div id="pdf-export-container" style={{ display: 'none', padding: '20px', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>SLOVENSKÁ SPELEOLOGICKÁ SPOLOČNOSŤ</h1>
          <h2 style={{ fontSize: '18px', margin: '0' }}>Technický denník č.: {formData.dennikCislo}</h2>
          <p style={{ fontSize: '14px', margin: '5px 0 0 0', fontStyle: 'italic' }}>{formData.skupina}</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', width: '30%' }}>Lokalita:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{formData.lokalita}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Poloha lokality (GPS):</td>
              <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{formData.poloha}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Krasové územie:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{formData.krasoveUzemie}</td>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Orografický celok:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{formData.orografickyCelok}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Dátum:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{formData.datum}</td>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Pracovná doba:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{formData.pracovnaDoba}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Počasie:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{formData.pocasie}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Vedúci akcie:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{formData.veduciAkcie}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Ostatní členovia SSS:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{formData.ostatniClenovia}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Iní účastníci:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{formData.iniUcastnici}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }} colSpan={4}>Popis práce (prípadný nákres):</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', height: '100px', verticalAlign: 'top', whiteSpace: 'pre-wrap' }} colSpan={4}>{formData.popisPrace}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Vyhĺbené [m]:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{formData.vyhlbene}</td>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Objavené [m]:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{formData.objavene}</td>
            </tr>
             <tr>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Zamerané [m]:</td>
              <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{formData.zamerane}</td>
            </tr>
          </tbody>
        </table>

        {/* Gallery for PDF */}
        {mediaFiles.filter(m => m.type === 'image').length > 0 && (
          <div style={{ marginTop: '20px', pageBreakBefore: 'always' }}>
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Fotogaléria</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {mediaFiles.filter(m => m.type === 'image').map(media => (
                <div key={media.id} style={{ width: '48%', marginBottom: '10px' }}>
                   {media.preview && <img src={media.preview} alt="Príloha" style={{ width: '100%', height: 'auto', border: '1px solid #eee', borderRadius: '4px' }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
