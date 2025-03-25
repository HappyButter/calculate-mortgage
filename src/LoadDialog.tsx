import { useState } from "react";

function LoadDialog({ onClose, loadFromLocalStorage }: { onClose: () => void; loadFromLocalStorage: (name: string) => void }) {
    const [select, setSelect] = useState("");
    const namesUsed = Object.keys(localStorage);

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
                borderRadius: "5px",
                width: "50%",
                height: "50%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}>

                <p>Dialog</p>
                {namesUsed.length === 0 ? <p>No data in local storage. Save one first.</p> : (
                    <>
                        <select value={select} onChange={(e) => setSelect(e.target.value)}>
                            {namesUsed.map((name, index) => (
                                <option key={`name-${index}`}>{name}</option>
                            ))}
                        </select>
                        <button onClick={() => loadFromLocalStorage(select)} disabled={!namesUsed.includes(select)}>Load from local storage</button>
                    </>)}
                <button onClick={onClose}>Close</button>
            </div>
        </dialog>
    )
}

export default LoadDialog;