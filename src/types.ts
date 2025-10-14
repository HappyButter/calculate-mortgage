export const kiedyNadplatyArray = ['W_WYBRANYM_DNIU', 'W_DNIU_RATY', 'CO_MIESIAC_W_DNIU_RATY', 'CO_MIESIAC_W_WYBRANYM_DNIU'] as const;
export type KiedyNadplataType = typeof kiedyNadplatyArray[number];
export const KiedyNadplata = 
  kiedyNadplatyArray.reduce((acc, item) => {
    acc[item] = item;
    return acc;
  }, {} as Record<KiedyNadplataType, KiedyNadplataType>) 
  
export const skutekNadplatyArray = ['WSZYSTKO_W_KAPITAL', 'NAJPIERW_ODSETKI'] as const;
export type SkutekNadplatyType = typeof skutekNadplatyArray[number];
export const SkutekNadplaty = 
  skutekNadplatyArray.reduce((acc, item) => {
    acc[item] = item;
    return acc;
  }, {} as Record<SkutekNadplatyType, SkutekNadplatyType>) 


export type Nadplata = {
    id: string;
    kwota: number;
    kiedyNadplata: KiedyNadplataType;
    skutekNadplaty: SkutekNadplatyType;
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
  