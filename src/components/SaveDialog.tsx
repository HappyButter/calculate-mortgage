import { useMemo, useState } from "react";


const SaveDialog = ({ onClose, saveToLocalStorage }: { onClose: () => void; saveToLocalStorage: (name: string) => void }) => {
    const [name, setName] = useState("");
    const namesUsed = Object.keys(localStorage);

    const isNameUsed = useMemo(() => namesUsed.includes(name), [name, namesUsed]);

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
        }}
        >
            <div style={{
                backgroundColor: "rgb(167, 167, 167)",
                padding: "20px",
                margin: "20px",
                borderRadius: "5px",
                width: "50%",
                height: "50%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", width: "100%" }}>
                    <div style={{ display: "flex", flexDirection: "column", marginBottom: isNameUsed ? "10px" : "34px" }}>
                        <label htmlFor="name">Zapisz pod nazwą</label>
                        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                        <div style={{ color: "rgb(208, 59, 59)" }}>{isNameUsed ? "Nazwa wykorzystana. Spróbuj innej." : ""}</div>
                    </div>

                    <div>
                        <button
                            style={isNameUsed ? {} : { backgroundColor: "rgb(75,175,80)", color: "white" }}
                            onClick={() => {saveToLocalStorage(name); onClose()}} disabled={isNameUsed}>
                            Zapisz do pamięci przeglądarki
                        </button>
                        <button
                            style={{ backgroundColor: "rgb(237,129,103)", color: "white", marginLeft: "10px" }}
                            onClick={onClose}>Zamknij
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    )
}

export default SaveDialog;