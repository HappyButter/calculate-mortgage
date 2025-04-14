import { CSSProperties } from "react";

type DateInputProps = {
    value: string | undefined;
    onChange: (value: string) => void;
    label?: string | null;
    required?: boolean;
    disabled?: boolean;
    styles?: CSSProperties;
};

const DateInput = ({ value, onChange, label, required, disabled, styles }: DateInputProps) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "10px", ...styles }}>
            <label htmlFor="date-input">{label}</label>
            <input
                type="date"
                id="date-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                required={required} />
        </div>
    );
}


export default DateInput;