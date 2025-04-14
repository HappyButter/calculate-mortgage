import { addMonths, differenceInCalendarDays, getDaysInYear, getOverlappingDaysInIntervals, isWithinInterval, subDays, subMonths } from "date-fns";
import { Rata, Zmiany, KiedyNadplata } from "./types";

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


export function obliczRatyMalejace2(aktualnaRata: Rata, zmiany: Zmiany): Rata[] {
    const listaRat: Rata[] = [];
    let dataRaty = zmiany.dataPierwszejRaty ? new Date(zmiany.dataPierwszejRaty) : new Date();
    let dataMiesiacPrzedRata = subMonths(new Date(dataRaty), 1);

    let nowaRata = { ...aktualnaRata };

    while (nowaRata.kapital > 0 && nowaRata.numerRaty <= nowaRata.iloscRat) {
        nowaRata = { ...nowaRata };
        nowaRata.data = dateToString(dataRaty);

        // nadplaty pomiędzy [dataMiesiacPrzedRata i dataRaty)
        const nadplatyPrzedRata = zmiany.nadplaty
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


        if (nadplatyPrzedRata.length > 0) {
            let rataNadplaty = { ...nowaRata };
            let nadplataIdx = 0;


            for (const nadplata of nadplatyPrzedRata) {
                rataNadplaty = { ...rataNadplaty };

                const nadplataData = new Date(nadplata.data ?? ""); // here the date must exist - cuz it's filtered by date
                const dataOstatniejSplaty = nadplataIdx === 0
                    ? dataMiesiacPrzedRata
                    : new Date(nadplatyPrzedRata[nadplataIdx - 1].data ?? "");

                kwotaNadplatyIsLowerThanZero: {
                    if (nadplata.czyWyrownacDoKwoty) {
                        // if Nadplata has date and czyWyrownacDoKwoty is true, it means that the Nadplata must be equalised to the next Rata
                        const odsetkiDoNadplaty = obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, nadplataData, rataNadplaty.oprocentowanie);
                        const odsetkiDoRaty = obliczOdsetkiPomiedzyDatami(nadplataData, dataRaty, rataNadplaty.oprocentowanie);
                        const z = (1 / (rataNadplaty.iloscRat - rataNadplaty.numerRaty + 1)) + odsetkiDoRaty;
                        const kwotaNadplaty = (nadplata.kwota - (rataNadplaty.kapital * odsetkiDoNadplaty) - (rataNadplaty.kapital * z)) / (1 - z);

                        if (kwotaNadplaty < 0) {
                            break kwotaNadplatyIsLowerThanZero;
                        }

                        rataNadplaty.kwotaKapitalu = kwotaNadplaty;
                        rataNadplaty.kwotaOdsetek = rataNadplaty.kapital * odsetkiDoNadplaty;
                        rataNadplaty.kwotaCalkowita = rataNadplaty.kwotaKapitalu + rataNadplaty.kwotaOdsetek;
                        rataNadplaty.laczneKoszty += rataNadplaty.kwotaOdsetek;
                        rataNadplaty.data = dateToString(nadplataData);
                        rataNadplaty.czyToNadplata = true;
                        rataNadplaty.nadplaty = [{ ...nadplata, kwota: rataNadplaty.kwotaCalkowita }];
                        rataNadplaty.numerRaty = nowaRata.numerRaty - 1 + 0.1;

                        listaRat.push({ ...rataNadplaty });
                    } else {
                        const odsetkiDoNadplaty = obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, nadplataData, rataNadplaty.oprocentowanie);
                        const kwotaOdsetek = rataNadplaty.kapital * odsetkiDoNadplaty;
                        const kwotaNadplaty = nadplata.kwota - kwotaOdsetek;

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

                        listaRat.push({ ...rataNadplaty });
                    }
                    rataNadplaty.kapital -= rataNadplaty.kwotaKapitalu;
                }
                nadplataIdx++;
            }
            nowaRata.kapital = rataNadplaty.kapital;
            nowaRata.laczneKoszty = rataNadplaty.laczneKoszty;


            // kwotaNadplatyIsLowerThanZero: {
            //     if (nadplatyPrzedRata[0].czyWyrownacDoKwoty && nadplatyPrzedRata[0].data) {
            //         // if Nadplata has date and czyWyrownacDoKwoty is true, it means that the Nadplata must be equalised to the next Rata
            //         let nadplata = { ...nadplatyPrzedRata[0] };
            //         let rataNadplaty = { ...nowaRata };
            //         const nadplataData = new Date(nadplata.data ?? "");

            //         const odsetkiDoNadplaty = obliczOdsetkiPomiedzyDatami(dataMiesiacPrzedRata, nadplataData, rataNadplaty.oprocentowanie);
            //         const odsetkiDoRaty = obliczOdsetkiPomiedzyDatami(nadplataData, dataRaty, rataNadplaty.oprocentowanie);
            //         const z = (1 / (rataNadplaty.iloscRat - rataNadplaty.numerRaty + 1)) + odsetkiDoRaty;
            //         const kwotaNadplaty = (nadplata.kwota - (rataNadplaty.kapital * odsetkiDoNadplaty) - (rataNadplaty.kapital * z)) / (1 - z);
            //         // console.log("kwotaNadplatyCałkowita", kwotaNadplaty + (rataNadplaty.kapital * odsetkiDoNadplaty));

            //         if (kwotaNadplaty < 0) {
            //             break kwotaNadplatyIsLowerThanZero;
            //         }

            //         rataNadplaty.kwotaKapitalu = kwotaNadplaty;
            //         rataNadplaty.kwotaOdsetek = rataNadplaty.kapital * odsetkiDoNadplaty;
            //         rataNadplaty.kwotaCalkowita = rataNadplaty.kwotaKapitalu + rataNadplaty.kwotaOdsetek;
            //         rataNadplaty.laczneKoszty += rataNadplaty.kwotaOdsetek;
            //         rataNadplaty.data = dateToString(nadplataData);
            //         rataNadplaty.czyToNadplata = true;
            //         rataNadplaty.nadplaty = [{ ...nadplata, kwota: rataNadplaty.kwotaCalkowita }];
            //         rataNadplaty.numerRaty = nowaRata.numerRaty - 1 + 0.1;
            //         listaRat.push({ ...rataNadplaty });

            //         nowaRata.kapital -= kwotaNadplaty;
            //         nowaRata.laczneKoszty += rataNadplaty.kwotaOdsetek;
            //     } else {
            //         let rataNadplaty = { ...nowaRata };
            //         let nadplataIdx = 0;
            //         for (const nadplata of nadplatyPrzedRata) {
            //             rataNadplaty = { ...rataNadplaty };

            //             const nadplataData = new Date(nadplata.data ?? ""); // here the date must exist - cuz it's filtered by date
            //             const dataOstatniejSplaty = nadplataIdx === 0
            //                 ? dataMiesiacPrzedRata
            //                 : new Date(nadplatyPrzedRata[nadplataIdx - 1].data ?? "");
            //             rataNadplaty.kwotaOdsetek = rataNadplaty.kapital * obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, nadplataData, rataNadplaty.oprocentowanie);
            //             rataNadplaty.kwotaKapitalu = nadplata.kwota - rataNadplaty.kwotaOdsetek > 0 ? nadplata.kwota - rataNadplaty.kwotaOdsetek : 0;
            //             rataNadplaty.kwotaCalkowita = nadplata.kwota;
            //             rataNadplaty.laczneKoszty += rataNadplaty.kwotaOdsetek;
            //             rataNadplaty.data = dateToString(nadplataData);

            //             rataNadplaty.czyToNadplata = true;
            //             rataNadplaty.nadplaty = [nadplata];
            //             rataNadplaty.numerRaty = nowaRata.numerRaty - 1 + ((nadplataIdx + 1) * 0.1);

            //             listaRat.push({ ...rataNadplaty });
            //             rataNadplaty.kapital -= rataNadplaty.kwotaKapitalu;
            //             nadplataIdx++;
            //         }
            //         nowaRata.kapital = rataNadplaty.kapital;
            //         nowaRata.laczneKoszty += rataNadplaty.kwotaOdsetek;
            //     }
            // }
        }

        // calculate kwotaKapitalu and kwotaOdsetek
        const dataOstatniejSplaty = nadplatyPrzedRata.length > 0
            ? new Date(nadplatyPrzedRata[nadplatyPrzedRata.length - 1].data ?? "")
            : dataMiesiacPrzedRata;

        nowaRata.kwotaKapitalu = nowaRata.kapital / (nowaRata.iloscRat - nowaRata.numerRaty + 1); // tricky part
        nowaRata.kwotaOdsetek = nowaRata.kapital * obliczOdsetkiPomiedzyDatami(dataOstatniejSplaty, dataRaty, nowaRata.oprocentowanie);
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

        dataMiesiacPrzedRata = new Date(dataRaty);
        dataRaty = addMonths(new Date(dataRaty), 1);

        nowaRata.kapital -= nowaRata.kwotaKapitalu;
        nowaRata.numerRaty++;
    }

    return listaRat;
}


function obliczOdsetkiPomiedzyDatami(data1: Date, data2: Date, oprocentowanieRoczne: number): number {
    const dni = differenceInCalendarDays(data2, data1);
    return (oprocentowanieRoczne / 100) * (dni / getDaysInYear(data2));
}

export function dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // months are zero-based
    const day = date.getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
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