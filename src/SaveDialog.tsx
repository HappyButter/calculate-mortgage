import { useMemo, useState } from "react";


const SaveDialog = ({ onClose, saveToLocalStorage }: { onClose: () => void; saveToLocalStorage: (name: string) => void }) => {
    const [name, setName] = useState("");
    const namesUsed = Object.keys(localStorage);

    const isNameValid = useMemo(() => namesUsed.includes(name), [name, namesUsed]);

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

                <p>Dialog</p>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                <p color="red">{isNameValid ? "Name already used" : ""}</p>
                <button onClick={() => saveToLocalStorage(name)} disabled={isNameValid}>Save to local storage</button>
                <button onClick={onClose}>Close</button>
            </div>
        </dialog>
    )
}

export default SaveDialog;