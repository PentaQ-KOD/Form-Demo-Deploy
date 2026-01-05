import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";

interface ChoiceFieldProps {
    options: string[];
    value: string | string[];
    onChange: (value: string | string[]) => void;
    multiple?: boolean;
    disabled?: boolean;
    variant?: "default" | "card" | "pill";
    descriptions?: Record<string, string>;
    icons?: Record<string, React.ReactNode>;
}

// Common "other" option variations in Thai
const OTHER_OPTIONS = ["อื่นๆ", "อื่น ๆ", "อื่นๆ (โปรดระบุ)", "อื่น ๆ (โปรดระบุ)", "other", "Other", "Others", "อื่น"];

export const ChoiceField = ({
    options,
    value,
    onChange,
    multiple = false,
    disabled = false,
    variant = "default",
    descriptions = {},
    icons = {},
}: ChoiceFieldProps) => {
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

    // Find if any option is an "other" option
    const otherOption = options.find(opt => OTHER_OPTIONS.some(other => opt.toLowerCase().includes(other.toLowerCase())));

    // Check if "other" is selected and extract the custom text
    const getOtherText = () => {
        if (!otherOption) return "";
        const otherValue = selectedValues.find(v => v.startsWith(otherOption + ":"));
        if (otherValue) {
            return otherValue.substring(otherOption.length + 1).trim();
        }
        return "";
    };

    const [otherText, setOtherText] = useState(getOtherText());

    // Check if "other" option is selected (either exact match or with custom text)
    const isOtherSelected = otherOption && selectedValues.some(v =>
        v === otherOption || v.startsWith(otherOption + ":")
    );

    // Update otherText when value changes externally
    useEffect(() => {
        setOtherText(getOtherText());
    }, [value]);

    const handleClick = (option: string) => {
        if (disabled) return;

        const isOther = otherOption && option === otherOption;

        if (multiple) {
            if (isOther) {
                // For "other" option in multiple mode
                const hasOther = selectedValues.some(v => v === otherOption || v.startsWith(otherOption + ":"));
                if (hasOther) {
                    // Remove all "other" variants
                    const newValues = selectedValues.filter(v => v !== otherOption && !v.startsWith(otherOption + ":"));
                    onChange(newValues);
                    setOtherText("");
                } else {
                    // Add "other" option
                    onChange([...selectedValues, otherOption]);
                }
            } else {
                const newValues = selectedValues.includes(option)
                    ? selectedValues.filter((v) => v !== option)
                    : [...selectedValues, option];
                onChange(newValues);
            }
        } else {
            if (isOther) {
                // For "other" option in single mode
                if (isOtherSelected) {
                    onChange("");
                    setOtherText("");
                } else {
                    onChange(otherOption);
                }
            } else {
                onChange(option);
                setOtherText("");
            }
        }
    };

    const handleOtherTextChange = (text: string) => {
        setOtherText(text);

        if (!otherOption) return;

        if (multiple) {
            // Remove old "other" values and add new one
            const filteredValues = selectedValues.filter(v => v !== otherOption && !v.startsWith(otherOption + ":"));
            if (text.trim()) {
                onChange([...filteredValues, `${otherOption}: ${text.trim()}`]);
            } else {
                onChange([...filteredValues, otherOption]);
            }
        } else {
            if (text.trim()) {
                onChange(`${otherOption}: ${text.trim()}`);
            } else {
                onChange(otherOption);
            }
        }
    };

    // Pill variant - horizontal chips
    if (variant === "pill") {
        return (
            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                        const isOther = otherOption && option === otherOption;
                        const isSelected = isOther
                            ? isOtherSelected
                            : selectedValues.includes(option);

                        return (
                            <button
                                key={option}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleClick(option)}
                                className={cn(
                                    "px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200",
                                    "hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isSelected
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-card text-foreground hover:border-primary/50",
                                    disabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
                {/* Other text input for pill variant */}
                {isOtherSelected && (
                    <input
                        type="text"
                        value={otherText}
                        onChange={(e) => handleOtherTextChange(e.target.value)}
                        placeholder="โปรดระบุ..."
                        disabled={disabled}
                        className={cn(
                            "w-full px-4 py-2 rounded-lg border-2 border-border",
                            "font-bai text-base bg-background",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        );
    }

    // Card variant - grid of cards with descriptions
    if (variant === "card") {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {options.map((option) => {
                        const isOther = otherOption && option === otherOption;
                        const isSelected = isOther
                            ? isOtherSelected
                            : selectedValues.includes(option);
                        const description = descriptions[option];
                        const icon = icons[option];

                        return (
                            <button
                                key={option}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleClick(option)}
                                className={cn(
                                    "p-4 rounded-xl border bg-card text-left transition-all duration-200",
                                    "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    "flex gap-4",
                                    isSelected
                                        ? "border-primary shadow-sm"
                                        : "border-border hover:border-primary/30",
                                    disabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2">
                                        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
                                        <div className="flex-1">
                                            <h4 className="font-medium text-foreground">{option}</h4>
                                            {description && (
                                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                    {description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Selection indicator */}
                                <div
                                    className={cn(
                                        "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                        isSelected
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground/30"
                                    )}
                                >
                                    {isSelected && (
                                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
                {/* Other text input for card variant */}
                {isOtherSelected && (
                    <input
                        type="text"
                        value={otherText}
                        onChange={(e) => handleOtherTextChange(e.target.value)}
                        placeholder="โปรดระบุ..."
                        disabled={disabled}
                        className={cn(
                            "w-full px-4 py-3 rounded-lg border-2 border-border",
                            "font-bai text-base bg-background",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        );
    }

    // Default variant - list of buttons (upgraded design)
    return (
        <div className="space-y-2">
            {options.map((option) => {
                const isOther = otherOption && option === otherOption;
                const isSelected = isOther
                    ? isOtherSelected
                    : selectedValues.includes(option);

                return (
                    <div key={option}>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleClick(option)}
                            className={cn(
                                "pir-form-choice w-full text-left px-4 py-3 rounded-xl border bg-card transition-all duration-200",
                                "flex items-center gap-3 font-bai text-base",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                "hover:shadow-sm",
                                isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50",
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

                        {/* Other text input - show when "other" is selected */}
                        {isOther && isSelected && (
                            <div className="mt-2 ml-8">
                                <input
                                    type="text"
                                    value={otherText}
                                    onChange={(e) => handleOtherTextChange(e.target.value)}
                                    placeholder="โปรดระบุ..."
                                    disabled={disabled}
                                    className={cn(
                                        "w-full px-4 py-2 rounded-lg border-2 border-border",
                                        "font-bai text-base bg-background",
                                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
                                        disabled && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
