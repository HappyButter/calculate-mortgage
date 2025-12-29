import { useState } from "react";

function LoadDialog({ onClose, loadFromLocalStorage }: { onClose: () => void; loadFromLocalStorage: (name: string) => void }) {
    const namesUsed = Object.keys(localStorage).sort();
    const [select, setSelect] = useState(namesUsed[0] ?? "");

    return (
        <dialog open={true} style={{
            zIndex: 1000,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            position: "fixed",
            top: "0",
            left: "0",
            height: "100%",
            width: "100%",
            padding: "0",
            margin: "0",
            border: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        }} >
            <div style={{
                backgroundColor: "rgb(167, 167, 167)",
                padding: "20px",
                margin: "20px",
                borderRadius: "8px",
                width: "50%",
                height: "50%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", width: "100%" }}>
                    <div style={{ display: "flex", flexDirection: "column", marginBottom: "34px" }}>
                        {namesUsed.length === 0
                            ? <>
                                <h3>Brak danych w bazie. Najpierw zapisz konfigurację.</h3>
                                <br />

                                <div>
                                    <button
                                        style={{ backgroundColor: "rgb(237,129,103)", color: "white", marginLeft: "10px" }}
                                        onClick={onClose}>Zamknij
                                    </button>
                                </div>
                            </>

                            : (
                                <>
                                    <h3>Wczytaj dane do aplikacji z pamięci przeglądarki</h3>
                                    <br />
                                    <select value={select} onChange={(e) => setSelect(e.target.value)}
                                        style={{ marginBottom: "10px", width: "100%" }}>
                                        {namesUsed.map((name, index) => (
                                            <option key={`name-${index}`}>{name}</option>
                                        ))}
                                    </select>


                                    <div>
                                        <button
                                            style={{ backgroundColor: "rgb(237,129,103)", color: "white", marginLeft: "10px" }}
                                            onClick={onClose}>
                                            Zamknij
                                        </button>
                                        <button
                                            style={!namesUsed.includes(select) ? {} : { backgroundColor: "rgb(75,175,80)", color: "white", marginLeft: "10px" }}
                                            onClick={() => { loadFromLocalStorage(select); onClose() }} disabled={!namesUsed.includes(select)}>
                                            Wczytaj
                                        </button>
                                    </div>

                                </>)}
                    </div>
                </div>
            </div>
        </dialog>
    )
}

export default LoadDialog;