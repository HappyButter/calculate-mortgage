import { useCallback, useMemo, useState } from "react"
import { useQueryState, parseAsFloat, parseAsArrayOf, parseAsInteger, parseAsJson, parseAsBoolean } from 'nuqs'

import LoadDialog from "./LoadDialog";
import SaveDialog from "./SaveDialog";
import { Rata, Nadplata } from "./types";
import { obliczRatyMalejace, obliczRatyStale, roundToTwo } from "./utils";

function App() {
  const [kapital, setKapital] = useQueryState('kapital', parseAsFloat.withDefault(294_951.30).withOptions({ clearOnDefault: false }));
  const [oprocentowanie, setOprocentowanie] = useQueryState('oprocentowanie', parseAsFloat.withDefault(5.61));
  const [iloscRat, setIloscRat] = useQueryState('iloscRat', parseAsInteger.withDefault(146));
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

  return (
    <>
      <h1>Kalkulator kredytowy</h1>

      <button onClick={() => setIsSaveDialogOpen(true)}>Zapisz</button>
      <button onClick={() => setIsLoadDialogOpen(true)}>Załaduj konfigurację</button>

      <br /><br />

      <section>
        <div className="section-header">
          <h3>Podstawowe dane kredytowe</h3>
        </div>

        <div className="section-body">

          <div>
            <label htmlFor="kapital">Kwota kredytu</label><br />
            <input id="kapital" type="number" value={kapital} onChange={(e) => setKapital(Number(e.target.value))} />
          </div>

          <div>
            <label htmlFor="oprocentowanie">Oprocentowanie</label><br />
            <input id="oprocentowanie" type="number" value={oprocentowanie} onChange={(e) => setOprocentowanie(Number(e.target.value))} />
          </div>

          <div>
            <label htmlFor="iloscRat">Ilość rat</label><br />
            <input id="iloscRat" type="number" value={iloscRat} onChange={(e) => setIloscRat(Number(e.target.value))} />
          </div>

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

      <br /><br />

      <section>
        <div className="section-header">
          <h3>Nadpłaty</h3>
        </div>

        <div className="section-body" style={{ display: "flex", flexDirection: "column" }} >
          {nadplaty.map((nadplata, index) => (
            <div key={`nadplata-${index}`} className="nadplata">
              <div>
                <label htmlFor="kwota">Kwota nadpłaty</label>
                <input id="kwota" type="number" value={nadplata.kwota} onChange={(e) => {
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].kwota = Number(e.target.value);
                    return newNadplaty;
                  })
                }} />
              </div>

              <div style={{ alignSelf: "flex-end", flex: 1 }}>
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

              <div>
                <label htmlFor="numerRatyStart">{nadplata.czyJednorazowa ? "Numer raty" : "Od Kiedy"}</label>
                <input id="numerRatyStart" type="number" value={nadplata.numerRatyStart} onChange={(e) => {
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].numerRatyStart = Number(e.target.value);
                    return newNadplaty;
                  })
                }} />
              </div>

              <div style={{ alignSelf: "flex-end" }}>
                <label htmlFor="numerRatyKoniec">{nadplata.czyJednorazowa ? null : "Do Kiedy"}</label>
                <input disabled={nadplata.czyJednorazowa} id="numerRatyKoniec" type="number" value={nadplata.numerRatyKoniec} onChange={(e) => {
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].numerRatyKoniec = Number(e.target.value);
                    return newNadplaty;
                  })
                }} />
              </div>

              <div style={{ alignSelf: "flex-end" }}>
                <button
                  style={{ display: 'flex', alignSelf: "flex-start", backgroundColor: "rgb(237,129,103)", color: "white" }}
                  onClick={() => {
                    setNadplaty(prev => {
                      const newNadplaty = [...prev];
                      newNadplaty.splice(index, 1);
                      return newNadplaty;
                    })
                  }}>Usuń</button>
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

      <br /><br />

      <section>
        <div className="section-header">
          <h3>Harmonogram spłaty kredytu</h3>
        </div>
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
      </section>

      {isSaveDialogOpen && <SaveDialog onClose={() => setIsSaveDialogOpen(false)} saveToLocalStorage={saveToLocalStorage} />}
      {isLoadDialogOpen && <LoadDialog onClose={() => setIsLoadDialogOpen(false)} loadFromLocalStorage={loadFromLocalStorage} />}
    </>
  )
}



export default App
