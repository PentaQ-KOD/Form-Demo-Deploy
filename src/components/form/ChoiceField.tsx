import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ChoiceFieldProps {
    options: string[];
    value: string | string[];
    onChange: (value: string | string[]) => void;
    multiple?: boolean;
    disabled?: boolean;
}

export const ChoiceField = ({
    options,
    value,
    onChange,
    multiple = false,
    disabled = false,
}: ChoiceFieldProps) => {
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

    const handleClick = (option: string) => {
        if (disabled) return;

        if (multiple) {
            const newValues = selectedValues.includes(option)
                ? selectedValues.filter((v) => v !== option)
                : [...selectedValues, option];
            onChange(newValues);
        } else {
            onChange(option);
        }
    };

    return (
        <div className="space-y-2">
            {options.map((option) => {
                const isSelected = selectedValues.includes(option);

                return (
                    <button
                        key={option}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleClick(option)}
                        className={cn(
                            "pir-form-choice w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200",
                            "flex items-center gap-3 font-bai text-base md:text-lg",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {/* Selection indicator */}
                        <div
                            className={cn(
                                "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                multiple ? "rounded" : "rounded-full",
                                isSelected
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/30"
                            )}
                        >
                            {isSelected && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                        </div>

                        {/* Option text */}
                        <span className="flex-1">{option}</span>
                    </button>
                );
            })}
        </div>
    );
};
