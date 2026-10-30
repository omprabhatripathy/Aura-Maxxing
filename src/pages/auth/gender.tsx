import "./Auth.css";

interface GenderProps {
  onSelect: (gender: string) => void;
}

export default function Gender({ onSelect }: GenderProps) {
  return (
    <div className="auth-container surface-level-2-glass">
      <h2 className="auth-title glow-primary">
        Select Your Gender
      </h2>

      <div className="gender-options">
        <button
          onClick={() => onSelect("male")}
          className="auth-button"
        >
          Male
        </button>

        <button
          onClick={() => onSelect("female")}
          className="auth-button"
        >
          Female
        </button>

        <button
          onClick={() => onSelect("other")}
          className="auth-button"
        >
          Other
        </button>
      </div>
    </div>
  );
}