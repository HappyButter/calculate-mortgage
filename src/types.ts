export type Nadplata = {
    kwota: number;
    data?: Date;
    czyJednorazowa: boolean;
    czyWyrownacDoKwoty?: boolean;
    numerRatyStart: number;
    numerRatyKoniec?: number;
  }

export type Rata = {
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
  