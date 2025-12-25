import { cn } from "@/lib/utils";

interface ProgressBarProps {
    current: number;
    total: number;
    className?: string;
}

export const ProgressBar = ({ current, total, className }: ProgressBarProps) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div className={cn("pir-form-progress", className)}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground font-bai">
                    คำถามที่ {current} จาก {total}
                </span>
                <span className="text-sm font-medium text-primary font-bai">
                    {percentage}%
                </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};
