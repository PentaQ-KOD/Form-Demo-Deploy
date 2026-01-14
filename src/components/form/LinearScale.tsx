import { cn } from "@/lib/utils";

interface LinearScaleProps {
    value: number | null;
    onChange: (value: number | null) => void;
    min?: number;
    max?: number;
    minLabel?: string;
    maxLabel?: string;
    disabled?: boolean;
}

export const LinearScale = ({
    value,
    onChange,
    min = 1,
    max = 5,
    minLabel,
    maxLabel,
    disabled = false,
}: LinearScaleProps) => {
    // Generate array of numbers from min to max
    const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col items-center justify-center w-full overflow-x-auto pb-2">
                <div className="flex items-end gap-4 sm:gap-8 min-w-fit px-2">
                    {/* Min Label */}
                    {minLabel && (
                        <div className="pb-3 text-sm text-muted-foreground font-bai pt-8 hidden sm:block">
                            {minLabel}
                        </div>
                    )}

                    {options.map((option) => {
                        const isSelected = value === option;
                        return (
                            <div
                                key={option}
                                className="flex flex-col items-center gap-3 cursor-pointer group"
                                onClick={() => !disabled && onChange(option)}
                            >
                                <span className={cn(
                                    "text-sm font-bai transition-colors",
                                    isSelected ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    {option}
                                </span>
                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                        isSelected
                                            ? "border-primary bg-primary/10"
                                            : "border-muted-foreground/60 group-hover:border-primary/60",
                                        disabled && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isSelected && (
                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Max Label */}
                    {maxLabel && (
                        <div className="pb-3 text-sm text-muted-foreground font-bai pt-8 hidden sm:block">
                            {maxLabel}
                        </div>
                    )}
                </div>

                {/* Mobile Labels (shown below on small screens) */}
                {(minLabel || maxLabel) && (
                    <div className="flex justify-between w-full mt-4 sm:hidden">
                        <span className="text-xs text-muted-foreground font-bai max-w-[45%]">{minLabel}</span>
                        <span className="text-xs text-muted-foreground font-bai text-right max-w-[45%]">{maxLabel}</span>
                    </div>
                )}
            </div>

            {/* Clear Selection */}
            {value !== null && !disabled && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                        className="text-sm text-muted-foreground hover:text-destructive hover:underline transition-colors font-bai"
                    >
                        Clear selection
                    </button>
                </div>
            )}
        </div>
    );
};
