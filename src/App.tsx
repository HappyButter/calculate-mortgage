import { useCallback, useMemo, useState } from "react"
import { useQueryState, parseAsFloat, parseAsArrayOf, parseAsInteger, parseAsJson, parseAsBoolean } from 'nuqs'

import LoadDialog from "./LoadDialog";
import SaveDialog from "./SaveDialog";
import { Rata, Nadplata } from "./types";
import { obliczRatyMalejace, obliczRatyStale, roundToTwo } from "./utils";
import useScreen from "./useScreen";
import NumberInput from "./NumberInput";

function App() {
  const { isMobile, orientation } = useScreen();

  const [kapital, setKapital] = useQueryState('kapital', parseAsFloat.withDefault(300_000));
  const [oprocentowanie, setOprocentowanie] = useQueryState('oprocentowanie', parseAsFloat.withDefault(8.11));
  const [iloscRat, setIloscRat] = useQueryState('iloscRat', parseAsInteger.withDefault(360));
  const [nadplaty, setNadplaty] = useQueryState('nadplaty', parseAsArrayOf(parseAsJson<Nadplata>((value) => value as Nadplata), ',').withDefault([]));
  const [czyRataMalejaca, setCzyRataMalejaca] = useQueryState('czyRataMalejaca', parseAsBoolean.withDefault(true));
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);

  const raty = useMemo(() => {
    const rata: Rata = {
      kapital: kapital,
      oprocentowanie: oprocentowanie,
      iloscRat: iloscRat,
      numerRaty: 1,
      kwotaKapitalu: 0,
      kwotaOdsetek: 0,
      kwotaCalkowita: 0,
      laczneKoszty: 0,
      nadplaty: []
    }

    return czyRataMalejaca ? obliczRatyMalejace(rata, { nadplaty }) : obliczRatyStale(rata, { nadplaty });;
  }, [kapital, oprocentowanie, iloscRat, nadplaty, czyRataMalejaca]);


  const saveToLocalStorage = useCallback((name: string) => {
    const data = JSON.stringify({ kapital, oprocentowanie, iloscRat, nadplaty, czyRataMalejaca });
    localStorage.setItem(name, data);
  }, [kapital, oprocentowanie, iloscRat, nadplaty]);

  const loadFromLocalStorage = useCallback((name: string) => {
    const data = localStorage.getItem(name);
    if (data) {
      const parsedData = JSON.parse(data);
      setKapital(prev => parsedData?.kapital ?? prev);
      setOprocentowanie(prev => parsedData?.oprocentowanie ?? prev);
      setIloscRat(prev => parsedData?.iloscRat ?? prev);
      setNadplaty(prev => parsedData?.nadplaty ?? prev);
      setCzyRataMalejaca(parsedData?.czyRataMalejaca ?? true);
    }
  }, []);

  if (isMobile && orientation === 'portrait') {
    return (
      <div className="phone-rotation-wrapper">
        <div className="phone">
        </div>
        <div className="message">
          Najpierw obróć urządzenie ;)
        </div>
      </div>
    )
  }

  return (
    <>
      <br />
      <h1>Kalkulator kredytowy</h1>
      <br />

      <button onClick={() => setIsSaveDialogOpen(true)} style={{ marginRight: "10px" }}>Zapisz</button>
      <button onClick={() => setIsLoadDialogOpen(true)}>Załaduj konfigurację</button>

      <br /><br />

      <section>
        <div className="section-header">
          <h3>Podstawowe dane kredytowe</h3>
        </div>

        <div className="section-body">
          <NumberInput value={kapital} onChange={setKapital} label="Kwota kredytu" inputAdornment="zł" />
          <NumberInput value={oprocentowanie} onChange={setOprocentowanie} label="Oprocentowanie" inputAdornment="%" />
          <NumberInput value={iloscRat} onChange={setIloscRat} label="Ilość rat" isInteger />
        </div>

        <div className="section-body" style={{ justifyContent: "center" }}>

          <div style={{ flex: 1 / 3, }}>
            <label htmlFor="czyRataMalejaca">Rodzaj rat</label><br />
            <select id="czyRataMalejaca" value={czyRataMalejaca ? 1 : 0} onChange={(e) => setCzyRataMalejaca(e.target.value === '1')}>
              <option value={1}>Malejące</option>
              <option value={0}>Stałe</option>
            </select>
          </div>

        </div>
      </section>

      <br />

      <section>
        <div className="section-header">
          <h3>Nadpłaty</h3>
        </div>

        <div className="section-body" style={{ display: "flex", flexDirection: "column", width: "100%" }} >
          {nadplaty.map((nadplata, index) => (
            <div key={`nadplata-${index}`} className="nadplata">

              <div style={{ alignSelf: "flex-end", flex: 1, display: "flex", flexDirection: "column" }}>
                <label htmlFor="czyWyrownacDoKwoty">Typ nadpłaty</label>
                <select id="czyWyrownacDoKwoty" value={nadplata.czyWyrownacDoKwoty ? 1 : 0} onChange={(e) =>
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].czyWyrownacDoKwoty = e.target.value === '1';
                    newNadplaty[index].numerRatyKoniec = e.target.value === '1' ? undefined : newNadplaty[index].numerRatyStart + 1;
                    return newNadplaty;
                  })
                }>
                  <option value={1}>Wyrównaj do kwoty</option>
                  <option value={0}>Dana kwota</option>
                </select>
              </div>


              <NumberInput
                styles={{ marginBottom: 0, flex: 1 }}
                value={nadplata.kwota}
                onChange={(value) => {
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].kwota = value;
                    return newNadplaty;
                  })
                }}
                label={nadplata.czyWyrownacDoKwoty ? "Wyrównaj do kwoty" : "Kwota nadpłaty"}
                inputAdornment="zł" />

              <div style={{ alignSelf: "flex-end", flex: 1, flexDirection: "column", display: "flex" }}>
                <label htmlFor="czyJednorazowa">Częstotliwość</label>
                <select id="czyJednorazowa" value={nadplata.czyJednorazowa ? 1 : 0} onChange={(e) =>
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].czyJednorazowa = e.target.value === '1';
                    newNadplaty[index].numerRatyKoniec = e.target.value === '1' ? undefined : newNadplaty[index].numerRatyStart + 1;
                    return newNadplaty;
                  })
                }>
                  <option value={1}>Jednorazowo</option>
                  <option value={0}>Co miesiąc</option>
                </select>
              </div>

              <NumberInput
                styles={{ marginBottom: 0 }}
                value={nadplata.numerRatyStart}
                onChange={(value) => {
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].numerRatyStart = value;
                    return newNadplaty;
                  })
                }}
                label={nadplata.czyJednorazowa ? "Numer raty" : "Od Kiedy"} />

              <NumberInput
                styles={{ marginBottom: 0 }}
                value={nadplata.numerRatyKoniec}
                onChange={(value) => {
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].numerRatyKoniec = value;
                    return newNadplaty;
                  })
                }
                }
                label={nadplata.czyJednorazowa ? null : "Do Kiedy"}
                disabled={nadplata.czyJednorazowa} />

              <div style={{ display: "flex", flexDirection: "row", width: "calc(100% - 16px)" }}>
                <button
                  style={{ alignSelf: "flex-end", backgroundColor: "rgb(237,129,103)", color: "white" }}
                  onClick={() => {
                    setNadplaty(prev => {
                      const newNadplaty = [...prev];
                      newNadplaty.splice(index, 1);
                      return newNadplaty;
                    })
                  }}>Usuń</button>

                <button
                  style={{ alignSelf: "flex-end", backgroundColor: "rgb(75,175,80)", color: "white", marginLeft: "8px" }}
                  onClick={() => {
                    setNadplaty(prev => {
                      const newNadplaty = [...prev];
                      newNadplaty.push({
                        kwota: nadplata.kwota,
                        czyJednorazowa: nadplata.czyJednorazowa,
                        czyWyrownacDoKwoty: nadplata.czyWyrownacDoKwoty,
                        numerRatyStart: nadplata.numerRatyStart + 1,
                        numerRatyKoniec: nadplata.numerRatyKoniec ? nadplata.numerRatyKoniec + 1 : undefined
                      });
                      return newNadplaty;
                    })
                   }}>
                  Kopiuj
                </button>
              </div>
            </div>))
          }
        </div>

        <div style={{ justifyContent: "left", display: "flex", padding: "8px 16px" }}>
          <button onClick={() => {
            setNadplaty([...nadplaty, {
              kwota: 1000,
              czyJednorazowa: true,
              numerRatyStart: nadplaty[nadplaty.length - 1]?.numerRatyStart + 1 || 1
            }])
          }} style={{ backgroundColor: "rgb(75,175,80)", color: "white" }}>Dodaj nadplate</button>
        </div>

      </section>

      <br />

      <section>
        <div className="section-header">
          <h3>Harmonogram spłaty kredytu</h3>
        </div>

        <div className="section-body">
            <table>
              <thead> 
                <tr>
                  <th>Rok</th>
                  <th>Numer raty</th>
                  <th>Kapital do spłaty</th>
                  <th>Rata</th>
                  <th>Kapitał</th>
                  <th>Odsetki</th>
                  <th>Koszt skumulowany</th>
                  <th>Nadpłaty</th>
                </tr>
              </thead>
              <tbody>
                {raty.map((rata, index) => (
                  <tr key={`rata-${index}`}>
                    <td>{rata.numerRaty % 12 === 1 ? (Math.floor(rata.numerRaty / 12) + 1) : null}</td>
                    <td>{rata.numerRaty}</td>
                    <td>{roundToTwo(rata.kapital)} zł</td>
                    <td><b>{roundToTwo(rata.kwotaCalkowita)} zł</b></td>
                    <td>{roundToTwo(rata.kwotaKapitalu)} zł</td>
                    <td>{roundToTwo(rata.kwotaOdsetek)} zł</td>
                    <td>{roundToTwo(rata.laczneKoszty)} zł</td>
                    <td>
                      {roundToTwo(rata.nadplaty?.reduce((a, b) => a + b.kwota, 0))} zł {rata.nadplaty?.length && rata.nadplaty?.length > 1 ? `(${rata.nadplaty?.length})` : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </section>

      <br />

      {isSaveDialogOpen && <SaveDialog onClose={() => setIsSaveDialogOpen(false)} saveToLocalStorage={saveToLocalStorage} />}
      {isLoadDialogOpen && <LoadDialog onClose={() => setIsLoadDialogOpen(false)} loadFromLocalStorage={loadFromLocalStorage} />}
    </>
  )
}



export default App
