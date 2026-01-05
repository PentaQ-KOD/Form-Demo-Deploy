import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface FormStepperProps {
    steps: string[];
    currentStep: number;
    className?: string;
}

export const FormStepper = ({ steps, currentStep, className }: FormStepperProps) => {
    return (
        <div className={cn("flex items-center justify-center w-full", className)}>
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;
                const isLast = index === steps.length - 1;

                return (
                    <div key={step} className="flex items-center">
                        {/* Step indicator */}
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300",
                                    isCompleted
                                        ? "bg-primary border-primary"
                                        : isCurrent
                                            ? "bg-primary border-primary"
                                            : "bg-transparent border-muted-foreground/30"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4 text-primary-foreground" />
                                ) : (
                                    <span
                                        className={cn(
                                            "text-sm font-medium",
                                            isCurrent
                                                ? "text-primary-foreground"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {stepNumber}
                                    </span>
                                )}
                            </div>
                            {/* Step label */}
                            <span
                                className={cn(
                                    "mt-2 text-xs font-medium whitespace-nowrap transition-colors",
                                    isCompleted || isCurrent
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                {step}
                            </span>
                        </div>

                        {/* Connector line */}
                        {!isLast && (
                            <div
                                className={cn(
                                    "w-16 md:w-24 h-[2px] mx-2 transition-colors duration-300",
                                    isCompleted
                                        ? "bg-primary"
                                        : "border-t-2 border-dashed border-muted-foreground/30"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
