import React from "react";

interface QuizSummaryProps {
    userName: string;
    testName: string;
    totalQuestions: number;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export const QuizSummary: React.FC<QuizSummaryProps> = ({
    userName,
    testName,
    totalQuestions,
    onSubmit,
    isSubmitting,
}) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 md:space-y-5 animate-slide-fade">
            <h2 className="text-xl md:text-2xl font-bold text-foreground font-bai text-center">
                สรุปการทำแบบทดสอบ
            </h2>

            <div className="space-y-2 md:space-y-3 text-center">
                <div>
                    <p className="text-xs text-muted-foreground font-noto">ชื่อผู้ทดสอบ</p>
                    <p className="text-lg md:text-xl font-semibold text-foreground font-noto">{userName}</p>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground font-noto">ชื่อแบบทดสอบ</p>
                    <p className="text-lg md:text-xl font-semibold text-foreground font-bai">{testName}</p>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground font-noto">จำนวนข้อ</p>
                    <p className="text-lg md:text-xl font-semibold text-foreground font-sen">{totalQuestions} ข้อ</p>
                </div>
            </div>

            <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className={`bg-quiz-submit-button hover:bg-quiz-submit-button/90 text-quiz-submit-button-foreground px-6 md:px-10 py-2.5 md:py-3.5 rounded-full text-base md:text-lg font-medium transition-colors font-bai shadow-md flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
            >
                {isSubmitting ? (
                    <>
                        <span className="animate-spin">⏳</span> กำลังส่ง...
                    </>
                ) : (
                    "ยืนยันการส่งคำตอบ"
                )}
            </button>
        </div>
    );
};
