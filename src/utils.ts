import { Rata, Zmiany } from "./types";

export function obliczRatyMalejace(aktualnaRata: Rata, zmiany: Zmiany): Rata[] {
    const listaRat: Rata[] = [];
    let nowaRata = { ...aktualnaRata };

    while (nowaRata.kapital > 0 && nowaRata.numerRaty <= nowaRata.iloscRat) {
        nowaRata = { ...nowaRata };

        nowaRata.kwotaKapitalu = nowaRata.kapital / (nowaRata.iloscRat - nowaRata.numerRaty + 1); // tricky part
        nowaRata.kwotaOdsetek = nowaRata.kapital * (nowaRata.oprocentowanie / 100) / 12;
        nowaRata.kwotaCalkowita = nowaRata.kwotaKapitalu + nowaRata.kwotaOdsetek;
        nowaRata.laczneKoszty += nowaRata.kwotaOdsetek;

        const nadplaty = zmiany.nadplaty.filter(nadplata =>
            nadplata.czyJednorazowa
                ? nadplata.numerRatyStart === nowaRata.numerRaty
                : nadplata.numerRatyStart <= nowaRata.numerRaty && (nadplata.numerRatyKoniec ?? Infinity) >= nowaRata.numerRaty)
            .map(nadplata => ({ ...nadplata })); // deep copy 

        if (nadplaty.length > 0) {
            nadplaty.forEach(nadplata => {
                if (nadplata.czyWyrownacDoKwoty) {
                    nadplata.kwota = nadplata.kwota - nowaRata.kwotaCalkowita > 0 ? nadplata.kwota - nowaRata.kwotaCalkowita : 0;
                }
            });

            nowaRata.nadplaty = nadplaty;
        } else {
            nowaRata.nadplaty = [];
        }

        listaRat.push({ ...nowaRata });

        if (nadplaty.length > 0) {
            // sum all nadplaty
            const sumaNadplat = nadplaty.reduce((a, b) => a + b.kwota, 0);
            nowaRata.kapital -= sumaNadplat;
        }

        nowaRata.kapital -= nowaRata.kwotaKapitalu;
        nowaRata.numerRaty++;
    }

    return listaRat;
}

export function obliczRatyStale(aktualnaRata: Rata, zmiany: Zmiany): Rata[] {
    const listaRat: Rata[] = [];
    let nowaRata = { ...aktualnaRata };

    while (nowaRata.kapital > 0 && nowaRata.numerRaty <= nowaRata.iloscRat) {
        nowaRata = { ...nowaRata };

        nowaRata.kwotaCalkowita = obliczAkutalnaRateStala(nowaRata.kapital, nowaRata.oprocentowanie, nowaRata.iloscRat - nowaRata.numerRaty + 1);
        nowaRata.kwotaOdsetek = nowaRata.kapital * (nowaRata.oprocentowanie / 100) / 12;
        nowaRata.kwotaKapitalu = nowaRata.kwotaCalkowita - nowaRata.kwotaOdsetek;
        nowaRata.laczneKoszty += nowaRata.kwotaOdsetek;

        const nadplaty = zmiany.nadplaty.filter(nadplata =>
            nadplata.czyJednorazowa
                ? nadplata.numerRatyStart === nowaRata.numerRaty
                : nadplata.numerRatyStart <= nowaRata.numerRaty && (nadplata.numerRatyKoniec ?? Infinity) >= nowaRata.numerRaty)
            .map(nadplata => ({ ...nadplata })); // deep copy 

        if (nadplaty.length > 0) {
            nadplaty.forEach(nadplata => {
                if (nadplata.czyWyrownacDoKwoty) {
                    nadplata.kwota = nadplata.kwota - nowaRata.kwotaCalkowita > 0 ? nadplata.kwota - nowaRata.kwotaCalkowita : 0;
                }
            });

            nowaRata.nadplaty = nadplaty;
        } else {
            nowaRata.nadplaty = [];
        }

        listaRat.push({ ...nowaRata });

        if (nadplaty.length > 0) {
            // sum all nadplaty
            const sumaNadplat = nadplaty.reduce((a, b) => a + b.kwota, 0);
            nowaRata.kapital -= sumaNadplat;
        }

        nowaRata.kapital -= nowaRata.kwotaKapitalu;
        nowaRata.numerRaty++;
    }

    return listaRat;
}

function obliczAkutalnaRateStala(kapitalPoczatkowy: number, oprocentowanieRoczne: number, liczbaRat: number, okresKapitalizacji = 12) {
    let stopaOkresowa = 1 + oprocentowanieRoczne / 100 / okresKapitalizacji;
    return kapitalPoczatkowy * Math.pow(stopaOkresowa, liczbaRat) * ((stopaOkresowa - 1) / (Math.pow(stopaOkresowa, liczbaRat) - 1));
}

export function roundToTwo(num: number | undefined): string {
    if (!num) {
        return "0";
    }
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0\u00A0");
}