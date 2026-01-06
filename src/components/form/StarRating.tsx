import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
    value: number;
    onChange: (rating: number) => void;
    maxRating?: number;
    disabled?: boolean;
    size?: "sm" | "md" | "lg";
}

export const StarRating = ({
    value,
    onChange,
    maxRating = 5,
    disabled = false,
    size = "md",
}: StarRatingProps) => {
    const [hoverValue, setHoverValue] = useState<number>(0);

    const sizeClasses = {
        sm: "h-6 w-6",
        md: "h-8 w-8",
        lg: "h-11 w-11",
    };

    const gapClasses = {
        sm: "gap-2",
        md: "gap-2.5",
        lg: "gap-3",
    };

    const displayValue = hoverValue || value;

    return (
        <div
            className={cn(
                "flex items-center",
                gapClasses[size],
                disabled && "opacity-50 cursor-not-allowed"
            )}
            onMouseLeave={() => setHoverValue(0)}
        >
            {Array.from({ length: maxRating }, (_, index) => {
                const starValue = index + 1;
                const isFilled = starValue <= displayValue;

                return (
                    <button
                        key={starValue}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(starValue)}
                        onMouseEnter={() => !disabled && setHoverValue(starValue)}
                        className={cn(
                            "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
                            !disabled && "hover:scale-110 cursor-pointer",
                            disabled && "cursor-not-allowed"
                        )}
                        aria-label={`Rate ${starValue} out of ${maxRating}`}
                    >
                        <Star
                            className={cn(
                                sizeClasses[size],
                                "transition-colors duration-150",
                                isFilled
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-transparent text-muted-foreground/40"
                            )}
                        />
                    </button>
                );
            })}
            {value > 0 && (
                <span className="ml-2 text-sm text-muted-foreground font-bai">
                    {value}/{maxRating}
                </span>
            )}
        </div>
    );
};
