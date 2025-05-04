export const kiedyNadplatyArray = ['W_WYBRANYM_DNIU', 'W_DNIU_RATY', 'CO_MIESIAC_W_DNIU_RATY', 'CO_MIESIAC_W_WYBRANYM_DNIU'] as const;
export type KiedyNadplataType = typeof kiedyNadplatyArray[number];
export const KiedyNadplata = 
  kiedyNadplatyArray.reduce((acc, item) => {
    acc[item] = item;
    return acc;
  }, {} as Record<KiedyNadplataType, KiedyNadplataType>) 


export type Nadplata = {
    id: string;
    kwota: number;
    kiedyNadplata: KiedyNadplataType;
    czyWyrownacDoKwoty?: boolean;
    data?: string;
    dataRatyStart?: string;
    dataRatyKoniec?: string;
    numerRatyStart?: number;
    numerRatyKoniec?: number;
  }

export type Rata = {
    data?: string;
    czyToNadplata?: boolean;
    kapital: number;
    oprocentowanie: number;
    iloscRat: number;
    numerRaty: number;
    kwotaKapitalu: number;
    kwotaOdsetek: number;
    kwotaCalkowita: number;
    laczneKoszty: number;
    nadplaty?: Nadplata[];
  }
  
export type Zmiany = {
    nadplaty: Nadplata[];
    dataPierwszejRaty?: string;
  }
  