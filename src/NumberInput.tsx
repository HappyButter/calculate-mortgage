import { CSSProperties, useState } from "react";

const NumberInput = ({ value, onChange, label, required, disabled, errorMessage, inputAdornment, isInteger, styles }: { value: number | undefined; onChange: (value: number) => void; label?: string | null; required?: boolean; disabled?: boolean; errorMessage?: string, inputAdornment?: string, isInteger?: boolean, styles?: CSSProperties }) => {
    const [localValue, setLocalValue] = useState<string>(value?.toString() ?? "");

    // should apply on focus out or valid float input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = isInteger ? parseInt(e.target.value) : parseFloat(e.target.value);
        if (!isNaN(parsedValue)) {
            onChange(parsedValue);
        }
        const parsedLocalValue =
            isInteger
                ? e.target.value.trim().replace(/[^0-9]/g, '').replace(/^0+(\d)*/, '$1')
                : e.target.value
                    .replace(/\s+/g, '')
                    .replace(/,/g, '.')
                    .replace(/^(?!0$)(?!0\.)0+|(?<=\.\d*)\.$|(\..*)\./g, '$1')
                    .replace(/[^0-9.]/g, '');

        setLocalValue(parsedLocalValue);
    }

    const handleFocusOut = () => {
        setLocalValue(prev => isNaN(Number(prev)) ? "0" : Number(prev).toString());

        const parsedValue = isInteger ? parseInt(localValue) : parseFloat(localValue);
        if (!isNaN(parsedValue)) {
            onChange(parsedValue);
        } else {
            onChange(0);
        }
    }


    // should show Input Adornments inside the input field 
    return (
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "10px", ...styles }}>
            <label htmlFor="name">{label}</label>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: disabled ? "#f0f0f0" : "transparent" }}>
                <input
                    id="name"
                    type="text"
                    disabled={disabled}
                    value={localValue}
                    onChange={handleChange}
                    required={required}
                    onBlur={(e) => {
                        handleFocusOut();
                        e.target.parentElement?.style.setProperty("outline", "none");
                    }}
                    onFocus={(e) => e.target.parentElement?.style.setProperty("outline", "olive 1px solid")}
                    style={{ border: "none", outline: "none", width: "100%"}}
                />
                <span style={{ margin: "0 10px", color: "#888" }}>{inputAdornment}</span>
            </div>
            <div style={{ color: "rgb(208, 59, 59)" }}>{errorMessage}</div>
        </div>
    )
}

export default NumberInput;