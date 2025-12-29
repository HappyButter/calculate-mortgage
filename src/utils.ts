import { addMonths, differenceInCalendarDays, format, getOverlappingDaysInIntervals, isBefore, isSameMonth, isWithinInterval, parseISO, subDays, subMonths } from "date-fns";
import { clone } from 'remeda';
import { Rata, Zmiany, KiedyNadplata, Nadplata, kiedyNadplatyArray, KiedyNadplataType, skutekNadplatyArray, SkutekNadplatyType, SkutekNadplaty } from "./types";
import { createParser } from 'nuqs'

export function obliczRatyMalejace(aktualnaRata: Rata, zmiany: Zmiany): Rata[] {
    const listaRat: Rata[] = [];
    let nowaRata = { ...aktualnaRata };

    while (nowaRata.kapital > 0 && nowaRata.numerRaty <= nowaRata.iloscRat) {
        nowaRata = { ...nowaRata };

        nowaRata.kwotaKapitalu = nowaRata.kapital / (nowaRata.iloscRat - nowaRata.numerRaty + 1); // tricky part
        nowaRata.kwotaOdsetek = nowaRata.kapital * (nowaRata.oprocentowanie / 100) / 12;
        nowaRata.kwotaCalkowita = nowaRata.kwotaKapitalu + nowaRata.kwotaOdsetek;
        nowaRata.laczneKoszty += nowaRata.kwotaOdsetek;

        const nadplaty = zmiany.nadplaty.filter(nadplata => {
            if (nadplata.kiedyNadplata === KiedyNadplata.W_DNIU_RATY) {
                return nadplata.numerRatyStart === nowaRata.numerRaty
            }
            if (nadplata.kiedyNadplata === KiedyNadplata.CO_MIESIAC_W_DNIU_RATY) {
                return (nadplata.numerRatyStart ?? Infinity) <= nowaRata.numerRaty && (nadplata.numerRatyKoniec ?? 0) >= nowaRata.numerRaty
            }
            return false;
        })
            .map(nadplata => ({ ...nadplata })); // deep copy 

        if (nadplaty.length > 0) {
            nadplaty.forEach(nadplata => {
                if (nadplata.czyWyrownacDoKwoty) {
                    // Ensure nadplata.kwota is not negative; set to 0 if the result is less than 0
                    nadplata.kwota = Math.max(0, nadplata.kwota - nowaRata.kwotaCalkowita);
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

type CalculateInstalmentsReturn = Rata[];

export function obliczRatyMalejace2(aktualnaRata: Rata, zmiany: Zmiany): CalculateInstalmentsReturn {
    const listaRat: Rata[] = [];
    let dataRaty = zmiany.dataPierwszejRaty ? new Date(zmiany.dataPierwszejRaty) : new Date();
    let dataMiesiacPrzedRata = subMonths(new Date(dataRaty), 1);

    let nowaRata = clone(aktualnaRata);

    while (nowaRata.kapital > 0 && nowaRata.numerRaty <= nowaRata.iloscRat) {
        nowaRata = clone(nowaRata);
        nowaRata.data = dateToString(dataRaty);
        nowaRata.kwotaOdsetek = 0.0;

        // nadplaty pomiędzy [dataMiesiacPrzedRata i dataRaty)
        const nadplatyPrzedRata = getNadplatyPrzedRata(zmiany.nadplaty, dataMiesiacPrzedRata, dataRaty);

        if (nadplatyPrzedRata.length > 0) {
            let rataNadplaty = clone(nowaRata);
            let nadplataIdx = 0;


            for (const nadplata of nadplatyPrzedRata) {
                rataNadplaty = clone(rataNadplaty);

                const nadplataData = new Date(nadplata.data ?? ""); // here the date must exist - cuz it's filtered by date
                const dataOstatniejSplaty = nadplataIdx === 0
                    ? dataMiesiacPrzedRata
                    : new Date(nadplatyPrzedRata[nadplataIdx - 1].data ?? "");

                kwotaNadplatyIsLowerThanZero: {
                    if (nadplata.skutekNadplaty === SkutekNadplaty.NAJPIERW_ODSETKI) {
                        if (nadplata.czyWyrownacDoKwoty) {
                            const odsetkiDoNadplaty = obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, nadplataData, rataNadplaty.oprocentowanie);
                            const odsetkiDoRaty = obliczOdsetkiPomiedzyDatami(nadplataData, dataRaty, rataNadplaty.oprocentowanie);
                            const z = (1 / (rataNadplaty.iloscRat - rataNadplaty.numerRaty + 1)) + odsetkiDoRaty;
                            const kwotaNadplaty = (nadplata.kwota - (rataNadplaty.kapital * odsetkiDoNadplaty) - (rataNadplaty.kapital * z)) / (1 - z);                            

                            if (kwotaNadplaty < 0) {
                                break kwotaNadplatyIsLowerThanZero;
                            }

                            rataNadplaty.kwotaKapitalu = roundToTwoDigits(kwotaNadplaty);
                            rataNadplaty.kwotaOdsetek = roundToTwoDigits(rataNadplaty.kapital * odsetkiDoNadplaty);
                            rataNadplaty.kwotaCalkowita = roundToTwoDigits(rataNadplaty.kwotaKapitalu + rataNadplaty.kwotaOdsetek);
                            rataNadplaty.laczneKoszty += rataNadplaty.kwotaOdsetek;
                            rataNadplaty.data = dateToString(nadplataData);
                            rataNadplaty.czyToNadplata = true;
                            rataNadplaty.nadplaty = [{ ...nadplata, kwota: rataNadplaty.kwotaCalkowita }];
                            rataNadplaty.numerRaty = nowaRata.numerRaty - 1 + ((nadplataIdx + 1) * 0.1);

                            listaRat.push(clone(rataNadplaty));
                        } else {
                            const odsetkiDoNadplaty = obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, nadplataData, rataNadplaty.oprocentowanie);
                            const kwotaOdsetek = roundToTwoDigits(rataNadplaty.kapital * odsetkiDoNadplaty);
                            const kwotaNadplaty = roundToTwoDigits(nadplata.kwota - kwotaOdsetek);

                            if (roundToTwoDigits(kwotaNadplaty) < 0) {
                                break kwotaNadplatyIsLowerThanZero;
                            }

                            rataNadplaty.kwotaOdsetek = kwotaOdsetek;
                            rataNadplaty.kwotaKapitalu = kwotaNadplaty;
                            rataNadplaty.kwotaCalkowita = nadplata.kwota;
                            rataNadplaty.laczneKoszty += rataNadplaty.kwotaOdsetek;
                            rataNadplaty.data = dateToString(nadplataData);

                            rataNadplaty.czyToNadplata = true;
                            rataNadplaty.nadplaty = [nadplata];
                            rataNadplaty.numerRaty = nowaRata.numerRaty - 1 + ((nadplataIdx + 1) * 0.1);

                            listaRat.push(clone(rataNadplaty));
                        }
                        rataNadplaty.kapital -= rataNadplaty.kwotaKapitalu;
                    } else if (nadplata.skutekNadplaty === SkutekNadplaty.WSZYSTKO_W_KAPITAL) {
                        if (nadplata.czyWyrownacDoKwoty) {
                            const odsetkiDoNadplaty = obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, nadplataData, rataNadplaty.oprocentowanie);
                            const odsetkiDoRaty = obliczOdsetkiPomiedzyDatami(nadplataData, dataRaty, rataNadplaty.oprocentowanie);
                            const z = (1 / (rataNadplaty.iloscRat - rataNadplaty.numerRaty + 1)) + odsetkiDoRaty;
                            const kwotaNadplaty = (nadplata.kwota - (rataNadplaty.kapital * odsetkiDoNadplaty) - (rataNadplaty.kapital * z)) / (1 - z);
                            const kwotaOdsetek = roundToTwoDigits(rataNadplaty.kapital * odsetkiDoNadplaty);

                            if (kwotaNadplaty < 0) {
                                break kwotaNadplatyIsLowerThanZero;
                            }

                            rataNadplaty.kwotaKapitalu = roundToTwoDigits(kwotaNadplaty);
                            rataNadplaty.kwotaOdsetek = 0.0;
                            // rataNadplaty.kwotaOdsetek = roundToTwoDigits(rataNadplaty.kapital * odsetkiDoNadplaty);
                            rataNadplaty.kwotaCalkowita = roundToTwoDigits(kwotaNadplaty);
                            // rataNadplaty.laczneKoszty += rataNadplaty.kwotaOdsetek;
                            rataNadplaty.data = dateToString(nadplataData);
                            rataNadplaty.czyToNadplata = true;
                            rataNadplaty.nadplaty = [{ ...nadplata, kwota: rataNadplaty.kwotaCalkowita }];
                            rataNadplaty.numerRaty = nowaRata.numerRaty - 1 + ((nadplataIdx + 1) * 0.1);

                            nowaRata.kwotaOdsetek += kwotaOdsetek;

                            listaRat.push(clone(rataNadplaty));
                        } else {
                            const odsetkiDoNadplaty = obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, nadplataData, rataNadplaty.oprocentowanie);
                            const kwotaOdsetek = roundToTwoDigits(rataNadplaty.kapital * odsetkiDoNadplaty);
                            const kwotaNadplaty = roundToTwoDigits(nadplata.kwota);

                            if (roundToTwoDigits(kwotaNadplaty) < 0) {
                                break kwotaNadplatyIsLowerThanZero;
                            }

                            rataNadplaty.kwotaOdsetek = 0.0;
                            rataNadplaty.kwotaKapitalu = kwotaNadplaty;
                            rataNadplaty.kwotaCalkowita = nadplata.kwota;
                            // rataNadplaty.laczneKoszty += rataNadplaty.kwotaOdsetek;
                            rataNadplaty.data = dateToString(nadplataData);

                            rataNadplaty.czyToNadplata = true;
                            rataNadplaty.nadplaty = [nadplata];
                            rataNadplaty.numerRaty = nowaRata.numerRaty - 1 + ((nadplataIdx + 1) * 0.1);

                            nowaRata.kwotaOdsetek += kwotaOdsetek;

                            listaRat.push(clone(rataNadplaty));
                        }
                        rataNadplaty.kapital -= rataNadplaty.kwotaKapitalu;
                    }
                    nadplataIdx++;
                }
            }
            nowaRata.kapital = rataNadplaty.kapital;
            nowaRata.laczneKoszty = rataNadplaty.laczneKoszty;
        }

        // calculate kwotaKapitalu and kwotaOdstek
        const dataOstatniejSplaty = nadplatyPrzedRata.length > 0 && (listaRat[listaRat.length - 1]?.nadplaty?.length ?? -1 > 0)
            ? new Date(listaRat[listaRat.length - 1].data ?? "")
            : dataMiesiacPrzedRata;

        nowaRata.kwotaKapitalu = roundToTwoDigits(nowaRata.kapital / (nowaRata.iloscRat - nowaRata.numerRaty + 1)); // tricky part
        nowaRata.kwotaOdsetek += roundToTwoDigits(nowaRata.kapital * obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, dataRaty, nowaRata.oprocentowanie));
        nowaRata.kwotaCalkowita = roundToTwoDigits(nowaRata.kwotaKapitalu + nowaRata.kwotaOdsetek);
        nowaRata.laczneKoszty += nowaRata.kwotaOdsetek;

        const nadplatyWDniuRaty = clone(
            zmiany.nadplaty.filter(nadplata => {
                if (nadplata.kiedyNadplata === KiedyNadplata.W_DNIU_RATY) {
                    return nadplata.numerRatyStart === nowaRata.numerRaty
                }
                if (nadplata.kiedyNadplata === KiedyNadplata.CO_MIESIAC_W_DNIU_RATY) {
                    return (nadplata.numerRatyStart ?? Infinity) <= nowaRata.numerRaty && (nadplata.numerRatyKoniec ?? 0) >= nowaRata.numerRaty
                }
                return false;
            }));

        if (nadplatyWDniuRaty.length > 0) {
            const updatedNadplaty = nadplatyWDniuRaty.map(nadplata => {
                if (nadplata.czyWyrownacDoKwoty) {
                    return { ...nadplata, kwota: Math.max(0, nadplata.kwota - nowaRata.kwotaCalkowita) };
                }
                return nadplata;
            });

            nowaRata.nadplaty = updatedNadplaty;
        } else {
            nowaRata.nadplaty = [];
        }

        listaRat.push(clone(nowaRata));

        if (nadplatyWDniuRaty.length > 0) {
            // sum all nadplaty
            const sumaNadplat = nadplatyWDniuRaty.reduce((a, b) => a + b.kwota, 0);
            nowaRata.kapital -= roundToTwoDigits(sumaNadplat);
        }

        dataMiesiacPrzedRata = new Date(dataRaty);
        dataRaty = addMonths(new Date(dataRaty), 1);

        nowaRata.kapital -= nowaRata.kwotaKapitalu;
        nowaRata.numerRaty++;
    }

    return listaRat;
}

function getNadplatyPrzedRata(nadplaty: Nadplata[], dataMiesiacPrzedRata: Date, dataRaty: Date): Nadplata[] {
    return nadplaty
        .filter(nadplata => {
            if (nadplata.kiedyNadplata === KiedyNadplata.W_WYBRANYM_DNIU && nadplata.dataRatyStart) {
                const nadplataData = new Date(nadplata.dataRatyStart);
                return isWithinInterval(nadplataData, { start: dataMiesiacPrzedRata, end: subDays(new Date(dataRaty), 1) });
            } else if (nadplata.kiedyNadplata === KiedyNadplata.CO_MIESIAC_W_WYBRANYM_DNIU && nadplata.dataRatyStart && nadplata.dataRatyKoniec) {
                const nadplataDataStart = new Date(nadplata.dataRatyStart);
                const nadplataDataEnd = new Date(nadplata.dataRatyKoniec);

                return getOverlappingDaysInIntervals(
                    { start: dataMiesiacPrzedRata, end: subDays(new Date(dataRaty), 1) },
                    { start: nadplataDataStart, end: nadplataDataEnd }
                ) > 0;

            }
            return false;
        })
        .map(nadplata => {
            if (nadplata.kiedyNadplata === KiedyNadplata.W_WYBRANYM_DNIU) {
                return { ...nadplata, data: nadplata.dataRatyStart };
            } else if (nadplata.kiedyNadplata === KiedyNadplata.CO_MIESIAC_W_WYBRANYM_DNIU && nadplata.dataRatyStart && nadplata.dataRatyKoniec) {
                const nadplataDataStart = new Date(nadplata.dataRatyStart);
                const nadplataDataEnd = new Date(nadplata.dataRatyKoniec);

                const everyMonthDates = getIntervalBetweenDatesEveryMonth({
                    start: nadplataDataStart,
                    end: nadplataDataEnd
                })
                const foundDate = everyMonthDates.find(date => isWithinInterval(date, { start: dataMiesiacPrzedRata, end: subDays(new Date(dataRaty), 1) }));

                if (foundDate) {
                    return { ...nadplata, data: dateToString(foundDate) };
                }
            }
            return null;
        })
        .filter(nadplata => nadplata !== null) // filter out null values
        .sort((a, b) => {
            if (a.data && b.data) {
                const nadplataDataA = new Date(a.data);
                const nadplataDataB = new Date(b.data);
                return differenceInCalendarDays(nadplataDataA, nadplataDataB);
            }
            return 0;
        })
}


function obliczOdsetkiPomiedzyDatami(data1: Date, data2: Date, oprocentowanieRoczne: number): number {
    const dni = differenceInCalendarDays(data2, data1);
    // return (oprocentowanieRoczne / 100) * (dni / getDaysInYear(data2));
    return (oprocentowanieRoczne / 100) * (dni / 365); // somehow for PKO BP every year has 365 days 
}

export function dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // months are zero-based
    const day = date.getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}


export function obliczRatyStale(aktualnaRata: Rata, zmiany: Zmiany): CalculateInstalmentsReturn {
    const listaRat: Rata[] = [];
    let nowaRata = { ...aktualnaRata };

    while (nowaRata.kapital > 0 && nowaRata.numerRaty <= nowaRata.iloscRat) {
        nowaRata = { ...nowaRata };

        nowaRata.kwotaCalkowita = roundToTwoDigits(obliczAkutalnaRateStala(nowaRata.kapital, nowaRata.oprocentowanie, nowaRata.iloscRat - nowaRata.numerRaty + 1));
        nowaRata.kwotaOdsetek = roundToTwoDigits(nowaRata.kapital * (nowaRata.oprocentowanie / 100) / 12);
        nowaRata.kwotaKapitalu = roundToTwoDigits(nowaRata.kwotaCalkowita - nowaRata.kwotaOdsetek);
        nowaRata.laczneKoszty += nowaRata.kwotaOdsetek;

        const nadplaty = zmiany.nadplaty.filter(nadplata => {
            if (nadplata.kiedyNadplata === KiedyNadplata.W_DNIU_RATY) {
                return nadplata.numerRatyStart === nowaRata.numerRaty
            }
            if (nadplata.kiedyNadplata === KiedyNadplata.CO_MIESIAC_W_DNIU_RATY) {
                return (nadplata.numerRatyStart ?? Infinity) <= nowaRata.numerRaty && (nadplata.numerRatyKoniec ?? 0) >= nowaRata.numerRaty
            }
            return false;
        }).map(nadplata => ({ ...nadplata })); // deep copy 

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

function roundToTwoDigits(num: number): number {
    return Math.round(num * 100) / 100;
}

function getIntervalBetweenDatesEveryMonth({ start, end }: { start: Date, end: Date }): Date[] {
    const months = [];

    let startDate = new Date(start);
    const endDate = new Date(end);

    while (differenceInCalendarDays(endDate, startDate) >= 0) {
        months.push(new Date(startDate));
        startDate = addMonths(startDate, 1);
    }

    return months;
}

export const parseAsArrayOfNadplata = createParser<Nadplata[]>({
    parse(query) {
        const value = decode(query);
        if (!value) {
            return [];
        }

        const parsedValue = JSON.parse(value);
        if (!Array.isArray(parsedValue)) {
            return [];
        }

        const depurifiedState = parsedValue.map(item => {
            return Object.fromEntries(
                Object.entries(item).map(([key, value]) => {
                    if (key == 'k') {
                        return ['kwota', value]
                    }
                    if (key == 'kn') {
                        const index = parseInt(value as string)
                        return ['kiedyNadplata', kiedyNadplatyArray[index]]
                    }
                    if (key == 'sn') {
                        const index = parseInt(value as string)
                        return ['skutekNadplaty', skutekNadplatyArray[index]]
                    }
                    if (key == 'cwdk') {
                        return ['czyWyrownacDoKwoty', value]
                    }
                    if (key == 'd') {
                        return ['data', value]
                    }
                    if (key == 'drs') {
                        return ['dataRatyStart', value]
                    }
                    if (key == 'drk') {
                        return ['dataRatyKoniec', value]
                    }
                    if (key == 'nrs') {
                        return ['numerRatyStart', value]
                    }
                    if (key == 'nrk') {
                        return ['numerRatyKoniec', value]
                    }

                    return [key, value];
                })
            )
        })

        const depurifiedStateWithDefaults = depurifiedState.map(item => item?.skutekNadplaty ? item : Object.assign(item, { "skutekNadplaty": SkutekNadplaty.NAJPIERW_ODSETKI }))

        return depurifiedStateWithDefaults as Nadplata[];
    },

    serialize(state) {
        if (!state || state.length === 0) {
            return '';
        }

        const purifiedState = state.map(item => {
            return Object.fromEntries(
                Object.entries(item).map(([key, value]) => {
                    if (key == 'kwota') {
                        return ['k', value]
                    }
                    if (key == 'kiedyNadplata') {
                        const index = kiedyNadplatyArray.indexOf(value as KiedyNadplataType)
                        return ['kn', index.toString()]
                    }
                    if (key == 'skutekNadplaty') {
                        const index = skutekNadplatyArray.indexOf(value as SkutekNadplatyType)
                        return ['sn', index.toString()]
                    }
                    if (key == 'czyWyrownacDoKwoty') {
                        return ['cwdk', value]
                    }
                    if (key == 'data') {
                        return ['d', value]
                    }
                    if (key == 'dataRatyStart') {
                        return ['drs', value]
                    }
                    if (key == 'dataRatyKoniec') {
                        return ['drk', value]
                    }
                    if (key == 'numerRatyStart') {
                        return ['nrs', value]
                    }
                    if (key == 'numerRatyKoniec') {
                        return ['nrk', value]
                    }

                    return [key, value];

                })
            )
        })

        return encode(JSON.stringify(purifiedState));
    }

})

function decode(str: string): string {
    return atob(str.replace(/\-/g, "+").replace(/_/g, "/"));
}

function encode(str: string): string {
    return btoa(str)
        .replace(/\//g, "_")
        .replace(/\+/g, "-")
        .replace(/=+$/, "");
}

export function beautifyFloat(num: number) {
    if (Number.isInteger(num)) {
        return num;
    }

    // Use toFixed with reasonable precision, then parse back to remove unnecessary trailing zeros
    const fixed = num.toFixed(3);
    return parseFloat(fixed);
}
