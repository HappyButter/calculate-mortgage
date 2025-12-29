import { useCallback, useMemo, useState } from "react"
import { useQueryState, parseAsFloat, parseAsInteger, parseAsBoolean, parseAsString } from 'nuqs'
import { v4 as uuidv4 } from 'uuid';
import { addMonths, getMonth } from "date-fns";

import LoadDialog from "./components/LoadDialog";
import SaveDialog from "./components/SaveDialog";
import { Rata, Nadplata, KiedyNadplata, KiedyNadplataType, SkutekNadplaty, SkutekNadplatyType } from "./types";
import { aggregateOverpaymentsForChart, beautifyFloat, dateToString, obliczRatyMalejace2, obliczRatyStale, parseAsArrayOfNadplata, prepareBurndownData, prepareRataBarChartData, roundToTwo } from "./utils";
import useScreen from "./useScreen";
import NumberInput from "./components/NumberInput";
import DateInput from "./components/DateInput";
import Section from "./components/Section";
import { Bar, BarChart, CartesianGrid, Label, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const Colors = {
  blue: "#36a2eb",
  red: "#ff6484",
  green: "#4bc0c0",
  orange: "#ff9f3f",
  purple: "#9966ff",
  yellow: "#ffcd56",
  grey: "#cacbcf"
}

const colorsArray = Object.entries(Colors).map(([_, val]) => val)

function* createColorGenerator() {
  var id = 0;
  const id_max = colorsArray.length - 1;

  while (true) {
    if (id > id_max) {
      id = 0;
    }
    yield colorsArray[id++]
  }
}

const colorGen = createColorGenerator();
const getColor = () => colorGen.next().value as string;


function App() {
  const { isMobile, orientation } = useScreen();

  const [dataPierwszejRaty, setDataPierwszejRaty] = useQueryState('dataPierwszejRaty', parseAsString.withDefault('2025-01-01'));
  const [kapital, setKapital] = useQueryState('kapital', parseAsFloat.withDefault(300_000));
  const [oprocentowanie, setOprocentowanie] = useQueryState('oprocentowanie', parseAsFloat.withDefault(8.11));
  const [iloscRat, setIloscRat] = useQueryState('iloscRat', parseAsInteger.withDefault(360));
  const [nadplaty, setNadplaty] = useQueryState('nadplaty', parseAsArrayOfNadplata.withDefault([]));
  const [czyRataMalejaca, setCzyRataMalejaca] = useQueryState('czyRataMalejaca', parseAsBoolean.withDefault(true));
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [key, setKey] = useState(0);

  const remountChild = useCallback(() => setKey(prev => prev + 1), []);

  const raty = useMemo(() => {
    const rataStart: Rata = {
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

    return czyRataMalejaca ? obliczRatyMalejace2(rataStart, { nadplaty, dataPierwszejRaty }) : obliczRatyStale(rataStart, { nadplaty });;
  }, [kapital, oprocentowanie, iloscRat, nadplaty, czyRataMalejaca, dataPierwszejRaty]);

  // console.log(raty);


  const chartsData = useMemo(() => aggregateOverpaymentsForChart(raty), [raty]);
  const years = Object.keys(chartsData[0]).filter((k) => k !== "month");
  const initAcc = years.map(el => ({ year: el, value: 0 }))

  const barChartOverpaymentData = chartsData.reduce((acc, item) => {
    for (const year of years) {
      const el = acc.find(el => (el.year == year))
      if (el) { el.value += item[Number.parseInt(year)]; }
    }
    return acc;
  }, initAcc)

  const barChartData = useMemo(() => prepareRataBarChartData(raty), [raty]);
  const separatorIndex = barChartData.findIndex((d) => !d.isPast);
  const separatorLabel = separatorIndex >= 0 ? barChartData[separatorIndex].date : null;

  const burndownChartData = useMemo(() => prepareBurndownData(raty), [raty]);


  const saveToLocalStorage = useCallback((name: string) => {
    const data = JSON.stringify({ kapital, oprocentowanie, iloscRat, nadplaty, czyRataMalejaca, dataPierwszejRaty });
    localStorage.setItem(name, data);
  }, [kapital, oprocentowanie, iloscRat, nadplaty, czyRataMalejaca, dataPierwszejRaty]);

  const loadFromLocalStorage = (name: string) => {
    const data = localStorage.getItem(name);
    if (data) {
      const parsedData = JSON.parse(data);

      const nadplatyWithId = parsedData?.nadplaty?.map((nadplata: Nadplata) => ({
        ...nadplata,
        id: nadplata.id ?? uuidv4(),
        skutekNadplaty: nadplata.skutekNadplaty ?? SkutekNadplaty.NAJPIERW_ODSETKI,
      }));

      setKapital(prev => parsedData?.kapital ?? prev);
      setOprocentowanie(prev => parsedData?.oprocentowanie ?? prev);
      setIloscRat(prev => parsedData?.iloscRat ?? prev);
      setNadplaty(prev => nadplatyWithId ?? prev);
      setCzyRataMalejaca(parsedData?.czyRataMalejaca ?? true);
      setDataPierwszejRaty(parsedData?.dataPierwszejRaty ?? new Date().toISOString().split('T')[0]);

      remountChild();
    }
  }

  // if (isMobile && orientation === 'portrait') {
  //   return (
  //     <div className="phone-rotation-wrapper">
  //       <div className="phone">
  //       </div>
  //       <div className="message">
  //         Najpierw obróć urządzenie ;)
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <>
      <br />
      <h1>Kalkulator kredytowy</h1>
      <br />

      <button onClick={() => setIsSaveDialogOpen(true)} style={{ marginRight: "10px" }}>Zapisz</button>
      <button onClick={() => setIsLoadDialogOpen(true)}>Załaduj konfigurację</button>

      <br /><br />

      <Section title="Podstawowe dane kredytowe">
        <div className="section-body">
          <NumberInput value={kapital} onChange={setKapital} label="Kwota kredytu" inputAdornment="zł" key={`kapital_${key}`} />
          <NumberInput value={oprocentowanie} onChange={setOprocentowanie} label="Oprocentowanie" inputAdornment="%" key={`oprocentowanie_${key}`} />
          <NumberInput value={iloscRat} onChange={setIloscRat} label="Ilość rat" isInteger key={`iloscRat_${key}`} />
          <DateInput value={dataPierwszejRaty} onChange={setDataPierwszejRaty} label="Data pierwszej raty" required />
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
      </Section>

      <br />

      <Section title="Nadpłaty">
        <div className="section-body" style={{ display: "flex", flexDirection: "column", width: "100%" }} >
          {nadplaty.map((nadplata, index) => (
            <div key={`nadplata-${nadplata.id ?? index}`} className="nadplata">

              <div style={{ alignSelf: "flex-end", flex: 1, display: "flex", flexDirection: "column" }}>
                <label htmlFor="skutekNadplaty">Skutek nadpłaty</label>
                <select id="skutekNadplaty" value={nadplata.skutekNadplaty} onChange={(e) =>
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    const newValue = e.target.value;

                    if (!newValue) {
                      return newNadplaty;
                    }

                    newNadplaty[index].skutekNadplaty = newValue as SkutekNadplatyType;
                    return newNadplaty;
                  })
                }>
                  <option value={SkutekNadplaty.NAJPIERW_ODSETKI}>Najpierw odsetki</option>
                  <option value={SkutekNadplaty.WSZYSTKO_W_KAPITAL}>Wszystko w kapitał</option>
                </select>
              </div>

              <div style={{ alignSelf: "flex-end", flex: 1, display: "flex", flexDirection: "column" }}>
                <label htmlFor="czyWyrownacDoKwoty">Typ nadpłaty</label>
                <select id="czyWyrownacDoKwoty" value={nadplata.czyWyrownacDoKwoty ? 1 : 0} onChange={(e) =>
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    newNadplaty[index].czyWyrownacDoKwoty = e.target.value === '1';
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
                label={nadplata.czyWyrownacDoKwoty ? "Wyrównaj do kwoty" : "Kwota"}
                inputAdornment="zł" />

              <div style={{ alignSelf: "flex-end", flex: 1, flexDirection: "column", display: "flex" }}>
                <label htmlFor="kiedyNadplata">Kiedy</label>
                <select id="kiedyNadplata" value={nadplata.kiedyNadplata} onChange={(e) =>
                  setNadplaty(prev => {
                    const newNadplaty = [...prev];
                    const newValue = e.target.value;

                    if (!newValue) {
                      return newNadplaty;
                    }
                    newNadplaty[index].kiedyNadplata = newValue as KiedyNadplataType;

                    if (newValue === KiedyNadplata.W_DNIU_RATY || newValue === KiedyNadplata.CO_MIESIAC_W_DNIU_RATY) {
                      newNadplaty[index].dataRatyStart = undefined;
                      newNadplaty[index].dataRatyKoniec = undefined;
                      const numerRatyStart = index === 0 ? 1 : ((newNadplaty[index - 1].numerRatyStart ?? 0) + 1);
                      newNadplaty[index].numerRatyStart = numerRatyStart;
                      newNadplaty[index].numerRatyKoniec = newValue === KiedyNadplata.W_DNIU_RATY ? undefined : (numerRatyStart + 1);

                    } else if (newValue === KiedyNadplata.W_WYBRANYM_DNIU || newValue === KiedyNadplata.CO_MIESIAC_W_WYBRANYM_DNIU) {
                      newNadplaty[index].numerRatyStart = undefined;
                      newNadplaty[index].numerRatyKoniec = undefined;
                      const dataRatyStart = index === 0 ? new Date().toISOString().split('T')[0] : (newNadplaty[index - 1].dataRatyStart ?? new Date().toISOString().split('T')[0]);
                      newNadplaty[index].dataRatyStart = dataRatyStart;
                      newNadplaty[index].dataRatyKoniec = newValue === KiedyNadplata.W_WYBRANYM_DNIU ? undefined : dateToString(addMonths(new Date(dataRatyStart), 1));
                    }

                    return newNadplaty;
                  })
                }>
                  <option value={KiedyNadplata.W_WYBRANYM_DNIU}>W wybranym dniu</option>
                  <option value={KiedyNadplata.W_DNIU_RATY}>W dniu raty</option>
                  <option value={KiedyNadplata.CO_MIESIAC_W_DNIU_RATY}>Co miesiąc w dniu raty</option>
                  <option value={KiedyNadplata.CO_MIESIAC_W_WYBRANYM_DNIU}>Co miesiąc w wybranym dniu</option>
                </select>
              </div>

              {
                nadplata.kiedyNadplata === KiedyNadplata.W_WYBRANYM_DNIU || nadplata.kiedyNadplata === KiedyNadplata.CO_MIESIAC_W_WYBRANYM_DNIU
                  ? <>
                    <DateInput
                      styles={{ marginBottom: 0 }}
                      value={nadplata.dataRatyStart || ""}
                      onChange={(value) => {
                        setNadplaty(prev => {
                          const newNadplaty = [...prev];
                          newNadplaty[index].dataRatyStart = value;
                          return newNadplaty;
                        })
                      }}
                      label={nadplata.kiedyNadplata === KiedyNadplata.W_WYBRANYM_DNIU ? "Data nadpłaty" : "Data pierwszej nadpłaty"} />

                    <DateInput
                      styles={{ marginBottom: 0 }}
                      value={nadplata.dataRatyKoniec || ""}
                      onChange={(value) => {
                        setNadplaty(prev => {
                          const newNadplaty = [...prev];
                          newNadplaty[index].dataRatyKoniec = value;
                          return newNadplaty;
                        })
                      }}
                      label={nadplata.kiedyNadplata === KiedyNadplata.W_WYBRANYM_DNIU ? undefined : "Data ostatniej nadpłaty"}
                      disabled={nadplata.kiedyNadplata === KiedyNadplata.W_WYBRANYM_DNIU} />
                  </> : (
                    <>
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
                        label={nadplata.kiedyNadplata === KiedyNadplata.W_DNIU_RATY ? "Numer raty" : "Od której raty"} />

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
                        label={nadplata.kiedyNadplata === KiedyNadplata.W_DNIU_RATY ? null : "Do której raty"}
                        disabled={nadplata.kiedyNadplata === KiedyNadplata.W_DNIU_RATY} />
                    </>
                  )
              }


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
                        id: uuidv4(),
                        kwota: nadplata.kwota,
                        skutekNadplaty: nadplata.skutekNadplaty,
                        kiedyNadplata: nadplata.kiedyNadplata,
                        czyWyrownacDoKwoty: nadplata.czyWyrownacDoKwoty,
                        numerRatyStart: nadplata.numerRatyStart ? nadplata.numerRatyStart + 1 : undefined,
                        numerRatyKoniec: nadplata.numerRatyKoniec ? nadplata.numerRatyKoniec + 1 : undefined,
                        dataRatyStart: nadplata.dataRatyStart ? dateToString(addMonths(new Date(nadplata.dataRatyStart), 1)) : undefined,
                        dataRatyKoniec: nadplata.dataRatyKoniec ? dateToString(addMonths(new Date(nadplata.dataRatyKoniec), 1)) : undefined
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
              id: uuidv4(),
              kwota: 1000,
              skutekNadplaty: SkutekNadplaty.NAJPIERW_ODSETKI,
              kiedyNadplata: KiedyNadplata.W_DNIU_RATY,
              numerRatyStart: (nadplaty[nadplaty.length - 1]?.numerRatyStart ?? 0) + 1
            }])
          }} style={{ backgroundColor: "rgb(75,175,80)", color: "white" }}>Dodaj nadplate</button>
        </div>

      </Section>

      <br />

      <Section title="wykresiki">

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={barChartOverpaymentData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={"year"} />
            <YAxis />
            <Tooltip />

            <Bar dataKey="value" stackId="a" fill={colorsArray[0]} />
            {/* 
            {years.map((year, index) => (
              <Bar dataKey={year} fill={colorsArray[index]} name={`${year}`} />
            ))} */}

          </BarChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart width={700} height={350} data={chartsData} margin={{ left: 20, top: 20, right: 15 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" label={{ value: "Miesiąc", position: "insideBottomRight", offset: -10 }} />
            <YAxis>
              <Label value="Nadpłata (PLN)" position="left" angle={-90} viewBox={{ x: 20, y: 60, width: 100, height: 100 }} />
            </YAxis>
            <Tooltip />
            <Legend />
            {years.map((year, index) => (
              <Line
                key={year}
                type="monotone"
                dataKey={year}
                strokeWidth={2}
                stroke={colorsArray[index]} // auto color by year
                name={`${year}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            width={800}
            height={400}
            data={barChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />

            {/* Capital part */}
            <Bar dataKey="kwotaKapitalu" stackId="a" fill={getColor()} name="Kapitał" />

            {/* Interest part */}
            <Bar dataKey="kwotaOdsetek" stackId="a" fill={getColor()} name="Odsetki" />

            {/* Dotted line separating past/future */}
            {/* {separatorLabel && (
              <ReferenceLine
                x={separatorLabel}
                stroke="green"
                // strokeDasharray="5 5"
                label={{
                  value: "Dziś",
                  position: "top",
                  fill: "#333",
                  fontSize: 12,
                }}
              />
            )} */}
          </BarChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={burndownChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              label={{
                value: "Remaining Capital (PLN)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              formatter={(v) => `${v.toLocaleString()} PLN`}
              labelFormatter={(l) => `Month: ${l}`}
            />

            {/* Main burndown line */}
            <Line
              type="monotone"
              dataKey="remainingCapital"
              stroke={getColor()}
              strokeWidth={3}
              dot={false}
              name="Remaining Capital"
            />

            {/* Dotted “today” line */}
            {separatorLabel && (
              <ReferenceLine
                x={separatorLabel}
                stroke="black"
                strokeDasharray="5 5"
                label={{
                  value: "Today",
                  position: "top",
                  fill: "#333",
                  fontSize: 12,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Section >

      <br />

      <Section title="Harmonogram spłaty kredytu" duration={500}>
        <div className="section-body">
          <table>
            <thead>
              <tr>
                {/* <th>Rok</th> */}
                <th style={{ textAlign: "center", padding: "0.35rem" }}>Numer raty</th>
                <th style={{ textAlign: "left", padding: "0.35rem" }}>Data</th>
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
                <tr key={`rata-${index}`} style={{
                  backgroundColor: rata.czyToNadplata ? "rgb(226, 241, 223)" : "white",
                  color:
                    (rata.data
                      ? getMonth(new Date(rata.data)) === 0 && Number.isInteger(rata.numerRaty)
                      : rata.numerRaty % 12 === 0)
                      ? "#646cff" : "black",
                }}>
                  {/* <td>{rata.numerRaty % 12 === 1 ? (Math.floor(rata.numerRaty / 12) + 1) : null}</td> */}
                  <td style={{ textAlign: "center", padding: "0.35rem" }}>{beautifyFloat(rata.numerRaty)}</td>
                  <td style={{ textAlign: "left", padding: "0.35rem" }}>{rata.data}</td>
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
      </Section>

      <br />

      {isSaveDialogOpen && <SaveDialog onClose={() => setIsSaveDialogOpen(false)} saveToLocalStorage={saveToLocalStorage} />}
      {isLoadDialogOpen && <LoadDialog onClose={() => setIsLoadDialogOpen(false)} loadFromLocalStorage={loadFromLocalStorage} />}
    </>
  )
}



export default App
