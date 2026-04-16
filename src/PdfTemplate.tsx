import React from 'react';
import { type DiaryEntry } from './db';

interface PdfTemplateProps {
  diary: Partial<DiaryEntry>;
  mediaPreviews: { id: string; preview: string }[];
}

export const PdfTemplate: React.FC<PdfTemplateProps> = ({ diary, mediaPreviews }) => {
  return (
    <div id="pdf-export-content" style={{ padding: '20px', fontFamily: 'sans-serif', color: '#000', background: '#fff', width: '100%' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>SLOVENSKÁ SPELEOLOGICKÁ SPOLOČNOSŤ</h1>
        <h2 style={{ fontSize: '18px', margin: '0' }}>Technický denník č.: {diary.dennikCislo || '_______'}</h2>
        <p style={{ fontSize: '14px', margin: '5px 0 0 0', fontStyle: 'italic' }}>{diary.skupina}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', width: '30%' }}>Lokalita:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{diary.lokalita}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Poloha lokality (GPS):</td>
            <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{diary.poloha}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Krasové územie:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }}>{diary.krasoveUzemie}</td>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Orografický celok:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }}>{diary.orografickyCelok}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Dátum:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }}>{diary.datum}</td>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Pracovná doba:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }}>{diary.pracovnaDoba}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Počasie:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{diary.pocasie}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Vedúci akcie:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{diary.veduciAkcie}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Ostatní členovia SSS:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{diary.ostatniClenovia}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Iní účastníci:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{diary.iniUcastnici}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }} colSpan={4}>Popis práce (prípadný nákres):</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', height: '100px', verticalAlign: 'top', whiteSpace: 'pre-wrap' }} colSpan={4}>{diary.popisPrace}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Vyhĺbené [m]:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }}>{diary.vyhlbene}</td>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Objavené [m]:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }}>{diary.objavene}</td>
          </tr>
            <tr>
            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Zamerané [m]:</td>
            <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{diary.zamerane}</td>
          </tr>
        </tbody>
      </table>

      {/* Gallery for PDF */}
      {mediaPreviews.length > 0 && (
        <div style={{ marginTop: '20px', pageBreakBefore: 'always' }}>
          <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Fotogaléria</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
            {mediaPreviews.map(media => (
              <div key={media.id} style={{ width: '48%', marginBottom: '10px' }}>
                  <img src={media.preview} alt="Príloha" style={{ width: '100%', height: 'auto', border: '1px solid #eee', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
