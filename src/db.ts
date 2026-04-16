import Dexie, { type EntityTable } from 'dexie';

export interface DiaryEntry {
  id?: number;
  dennikCislo: string;
  datum: string;
  pracovnaDoba: string;
  pocasie: string;
  lokalita: string;
  poloha: string;
  krasoveUzemie: string;
  orografickyCelok: string;
  skupina: string;
  veduciAkcie: string;
  ostatniClenovia: string;
  iniUcastnici: string;
  popisPrace: string;
  vyhlbene: string;
  objavene: string;
  zamerane: string;
  // Store multimedia as blobs/arraybuffers to allow reports/future usage
  multimedia: { id: string; name: string; type: string; data: ArrayBuffer }[];
  createdAt: string;
}

const db = new Dexie('SSSDennikDB') as Dexie & {
  diaries: EntityTable<DiaryEntry, 'id'>;
};

// Schema declaration
db.version(1).stores({
  diaries: '++id, dennikCislo, datum, lokalita, skupina, createdAt'
});

export { db };
