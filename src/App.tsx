import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, MapPin, CloudSun, Send, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: string;
}

function App() {
  const [formData, setFormData] = useState({
    dennikCislo: '',
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
    podpisAkcie: '',
    podpisKlubu: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Odosielam dáta:', formData);
    console.log('Médiá:', mediaFiles);
    alert('Dáta boli uložené (simulácia).');
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

          {/* Podpisy */}
          <section className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dátum a podpis vedúceho akcie</label>
                  <input type="text" name="podpisAkcie" value={formData.podpisAkcie} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dátum a podpis vedúceho klubu</label>
                  <input type="text" name="podpisKlubu" value={formData.podpisKlubu} onChange={handleChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
               </div>
            </div>
          </section>

          {/* Akcie */}
          <div className="pt-6 pb-2">
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md">
              <Send className="w-5 h-5" />
              Uložiť denník
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default App;
