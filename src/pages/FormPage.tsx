import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Check, Upload, X } from "lucide-react";
import { StarRating, ChoiceField, ProgressBar } from "@/components/form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Question types from Google Sheets schema
interface Question {
    id: string;
    type: "choices" | "text" | "phone" | "email" | "rating" | "file" | "date";
    label: string;
    description?: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    multiple?: boolean;
    multiline?: boolean;
    maxRating?: number;
    accept?: string;
    maxSize?: number;
}

interface FormConfig {
    title: string;
    description: string;
    questions: Question[];
}

type FormState = "loading" | "error" | "form" | "confirmation" | "submitting" | "thankyou";

const FETCH_URL = "https://auto.pirsquare.net/webhook-test/pir/form";
const SUBMIT_URL = "https://auto.pirsquare.net/webhook-test/pir/form/submit";

export default function FormPage() {
    const { formId } = useParams<{ formId: string }>();
    const navigate = useNavigate();

    const [formState, setFormState] = useState<FormState>("loading");
    const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
    const [formData, setFormData] = useState<Record<string, string | string[] | number | File | null>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Fetch form configuration
    const fetchFormConfig = async () => {
        if (!formId) {
            setErrorMessage("Form ID is required");
            setFormState("error");
            return;
        }

        setFormState("loading");
        setErrorMessage("");

        try {
            const response = await fetch(FETCH_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ form_id: formId }),
            });

            if (!response.ok) {
                throw new Error(`Failed to load form (${response.status})`);
            }

            const rawData = await response.json();

            // n8n returns array when using "allIncomingItems", extract first item
            const data = Array.isArray(rawData) ? rawData[0] : rawData;

            if (!data || !data.questions || data.questions.length === 0) {
                throw new Error("Invalid form configuration");
            }

            setFormConfig(data);

            // Initialize form data
            const initialData: Record<string, string | string[] | number | File | null> = {};
            data.questions.forEach((q: Question) => {
                if (q.type === "choices" && q.multiple) {
                    initialData[q.id] = [];
                } else if (q.type === "rating") {
                    initialData[q.id] = 0;
                } else if (q.type === "file") {
                    initialData[q.id] = null;
                } else {
                    initialData[q.id] = "";
                }
            });
            setFormData(initialData);
            setFormState("form");
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Failed to load form");
            setFormState("error");
        }
    };

    useEffect(() => {
        fetchFormConfig();
    }, [formId]);

    // Calculate answered questions count
    const answeredCount = useMemo(() => {
        if (!formConfig) return 0;
        return formConfig.questions.filter((q) => {
            const value = formData[q.id];
            if (q.type === "choices" && q.multiple) {
                return Array.isArray(value) && value.length > 0;
            }
            if (q.type === "rating") {
                return typeof value === "number" && value > 0;
            }
            if (q.type === "file") {
                return value !== null;
            }
            return value !== "" && value !== undefined;
        }).length;
    }, [formData, formConfig]);

    // Current question
    const currentQuestion = formConfig?.questions[currentQuestionIndex];

    // Handle input change
    const handleChange = (questionId: string, value: string | string[] | number | File | null) => {
        setFormData((prev) => ({ ...prev, [questionId]: value }));
        // Clear validation error when user starts typing
        if (validationErrors[questionId]) {
            setValidationErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[questionId];
                return newErrors;
            });
        }
    };

    // Validate single question
    const validateQuestion = (question: Question): string | null => {
        const value = formData[question.id];

        if (question.required) {
            if (question.type === "choices" && question.multiple) {
                if (!Array.isArray(value) || value.length === 0) {
                    return "กรุณาเลือกอย่างน้อย 1 ตัวเลือก";
                }
            } else if (question.type === "rating") {
                if (typeof value !== "number" || value === 0) {
                    return "กรุณาให้คะแนน";
                }
            } else if (question.type === "file") {
                if (!value) {
                    return "กรุณาอัปโหลดไฟล์";
                }
            } else {
                if (!value || value === "") {
                    return "กรุณากรอกข้อมูล";
                }
            }
        }

        // Email validation
        if (question.type === "email" && value && typeof value === "string") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return "รูปแบบอีเมลไม่ถูกต้อง";
            }
        }

        // Phone validation
        if (question.type === "phone" && value && typeof value === "string") {
            const phoneRegex = /^[0-9\-\+\s\(\)]{8,}$/;
            if (!phoneRegex.test(value)) {
                return "รูปแบบเบอร์โทรไม่ถูกต้อง";
            }
        }

        return null;
    };

    // Validate all questions
    const validateAll = (): boolean => {
        if (!formConfig) return false;

        const errors: Record<string, string> = {};
        formConfig.questions.forEach((q) => {
            const error = validateQuestion(q);
            if (error) {
                errors[q.id] = error;
            }
        });

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Navigation
    const goToNext = () => {
        if (!currentQuestion) return;

        const error = validateQuestion(currentQuestion);
        if (error) {
            setValidationErrors((prev) => ({ ...prev, [currentQuestion.id]: error }));
            return;
        }

        if (currentQuestionIndex < (formConfig?.questions.length || 0) - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        }
    };

    const goToPrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        }
    };

    const goToConfirmation = () => {
        if (validateAll()) {
            setFormState("confirmation");
        } else {
            // Find first error and navigate to it
            const firstErrorIndex = formConfig?.questions.findIndex(
                (q) => validationErrors[q.id]
            );
            if (firstErrorIndex !== undefined && firstErrorIndex >= 0) {
                setCurrentQuestionIndex(firstErrorIndex);
            }
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
        }
    };

    // Submit form
    const handleSubmit = async () => {
        if (!formConfig) return;

        setFormState("submitting");

        try {
            // Prepare answers (convert Files to names for now)
            const answers: Record<string, unknown> = {};
            Object.entries(formData).forEach(([key, value]) => {
                if (value instanceof File) {
                    answers[key] = value.name;
                } else {
                    answers[key] = value;
                }
            });

            const payload = {
                form_id: formId,
                form_title: formConfig.title,
                answers,
                submitted_at: new Date().toISOString(),
            };

            const response = await fetch(SUBMIT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to submit form");
            }

            setFormState("thankyou");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to submit form");
            setFormState("confirmation");
        }
    };

    // Render question input
    const renderQuestionInput = (question: Question) => {
        const value = formData[question.id];
        const error = validationErrors[question.id];

        switch (question.type) {
            case "choices":
                return (
                    <ChoiceField
                        options={question.options || []}
                        value={value as string | string[]}
                        onChange={(v) => handleChange(question.id, v)}
                        multiple={question.multiple}
                    />
                );

            case "rating":
                return (
                    <StarRating
                        value={typeof value === "number" ? value : 0}
                        onChange={(v) => handleChange(question.id, v)}
                        maxRating={question.maxRating || 5}
                        size="lg"
                    />
                );

            case "text":
                if (question.multiline) {
                    return (
                        <textarea
                            value={typeof value === "string" ? value : ""}
                            onChange={(e) => handleChange(question.id, e.target.value)}
                            placeholder={question.placeholder}
                            className={cn(
                                "pir-form-input w-full min-h-[120px] rounded-lg border-2 px-4 py-3",
                                "font-bai text-base md:text-lg resize-none",
                                "focus:outline-none focus:ring-2 focus:ring-ring",
                                error ? "border-destructive" : "border-border"
                            )}
                            rows={4}
                        />
                    );
                }
                return (
                    <Input
                        type="text"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={question.placeholder}
                        className={cn(
                            "pir-form-input h-12 md:h-14 text-base md:text-lg font-bai",
                            error && "border-destructive"
                        )}
                    />
                );

            case "email":
                return (
                    <Input
                        type="email"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={question.placeholder || "example@email.com"}
                        className={cn(
                            "pir-form-input h-12 md:h-14 text-base md:text-lg font-bai",
                            error && "border-destructive"
                        )}
                    />
                );

            case "phone":
                return (
                    <Input
                        type="tel"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={question.placeholder || "08x-xxx-xxxx"}
                        className={cn(
                            "pir-form-input h-12 md:h-14 text-base md:text-lg font-bai",
                            error && "border-destructive"
                        )}
                    />
                );

            case "date":
                return (
                    <Input
                        type="date"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        className={cn(
                            "pir-form-input h-12 md:h-14 text-base md:text-lg font-bai",
                            error && "border-destructive"
                        )}
                    />
                );

            case "file":
                const file = value instanceof File ? value : null;
                return (
                    <div className="space-y-2">
                        <label
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-32",
                                "border-2 border-dashed rounded-lg cursor-pointer",
                                "hover:bg-muted/50 transition-colors",
                                error ? "border-destructive" : "border-border"
                            )}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground font-bai">
                                    คลิกเพื่ออัปโหลดไฟล์
                                </p>
                                {question.accept && (
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        รองรับ: {question.accept}
                                    </p>
                                )}
                                {question.maxSize && (
                                    <p className="text-xs text-muted-foreground/70">
                                        ขนาดสูงสุด: {question.maxSize}MB
                                    </p>
                                )}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept={question.accept}
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0] || null;
                                    if (selectedFile && question.maxSize) {
                                        const maxBytes = question.maxSize * 1024 * 1024;
                                        if (selectedFile.size > maxBytes) {
                                            toast.error(`ไฟล์มีขนาดเกิน ${question.maxSize}MB`);
                                            return;
                                        }
                                    }
                                    handleChange(question.id, selectedFile);
                                }}
                            />
                        </label>
                        {file && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <span className="text-sm font-bai flex-1 truncate">
                                    {file.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleChange(question.id, null)}
                                    className="p-1 hover:bg-destructive/20 rounded"
                                >
                                    <X className="h-4 w-4 text-destructive" />
                                </button>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    // Loading state
    if (formState === "loading") {
        return (
            <div className="pir-form-container">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="space-y-4 w-full max-w-md">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2 animate-pulse">
                                <div className="h-5 w-32 bg-muted rounded" />
                                <div className="h-12 w-full bg-muted rounded-md" />
                            </div>
                        ))}
                        <div className="text-center text-muted-foreground font-bai mt-4">
                            กำลังโหลดแบบฟอร์ม...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (formState === "error") {
        return (
            <div className="pir-form-container">
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <div className="flex items-center space-x-2 text-destructive">
                        <AlertCircle className="h-6 w-6" />
                        <span className="text-lg font-medium font-bai">ไม่สามารถโหลดแบบฟอร์มได้</span>
                    </div>
                    {errorMessage && (
                        <p className="text-sm text-muted-foreground font-bai text-center max-w-sm">
                            {errorMessage}
                        </p>
                    )}
                    <Button onClick={fetchFormConfig} variant="outline" className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4" />
                        <span className="font-bai">ลองใหม่</span>
                    </Button>
                </div>
            </div>
        );
    }

    // Thank you state
    if (formState === "thankyou") {
        return (
            <div className="pir-form-container">
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-3xl font-bold font-bai text-foreground">
                            ขอบคุณครับ!
                        </h2>
                        <p className="text-muted-foreground font-bai">
                            เราได้รับข้อมูลของคุณเรียบร้อยแล้ว
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate("/")}
                        variant="outline"
                        className="font-bai"
                    >
                        กลับหน้าหลัก
                    </Button>
                </div>
            </div>
        );
    }

    // Confirmation state
    if (formState === "confirmation" && formConfig) {
        return (
            <div className="pir-form-container">
                <div className="max-w-2xl mx-auto py-6 px-4">
                    <h2 className="text-2xl md:text-3xl font-bold font-bai text-foreground mb-2">
                        ตรวจสอบข้อมูลก่อนส่ง
                    </h2>
                    <p className="text-muted-foreground font-bai mb-6">
                        กรุณาตรวจสอบคำตอบของคุณก่อนยืนยันการส่ง
                    </p>

                    <div className="space-y-4 mb-8">
                        {formConfig.questions.map((q, index) => {
                            const value = formData[q.id];
                            let displayValue = "-";

                            if (q.type === "choices" && q.multiple && Array.isArray(value)) {
                                displayValue = value.length > 0 ? value.join(", ") : "-";
                            } else if (q.type === "rating" && typeof value === "number") {
                                displayValue = value > 0 ? `${value}/${q.maxRating || 5} ดาว` : "-";
                            } else if (q.type === "file" && value instanceof File) {
                                displayValue = value.name;
                            } else if (typeof value === "string" && value) {
                                displayValue = value;
                            }

                            return (
                                <div
                                    key={q.id}
                                    className="p-4 bg-card rounded-lg border border-border"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-sm text-muted-foreground font-bai">
                                            {index + 1}.
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-medium font-bai text-foreground">
                                                {q.label}
                                            </p>
                                            <p className="text-muted-foreground font-bai mt-1">
                                                {displayValue}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setFormState("form")}
                            className="flex-1 font-bai"
                        >
                            แก้ไขคำตอบ
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="flex-1 font-bai"
                        >
                            ยืนยันส่งคำตอบ
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Submitting state
    if (formState === "submitting") {
        return (
            <div className="pir-form-container">
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <div className="animate-spin">
                        <RefreshCw className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground font-bai">
                        กำลังส่งข้อมูล...
                    </p>
                </div>
            </div>
        );
    }

    // Form state
    if (!formConfig || !currentQuestion) return null;

    const isLastQuestion = currentQuestionIndex === formConfig.questions.length - 1;
    const isFirstQuestion = currentQuestionIndex === 0;

    return (
        <div className="pir-form-container">
            <div className="max-w-2xl mx-auto py-6 px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold font-bai text-foreground">
                        {formConfig.title}
                    </h1>
                    {formConfig.description && (
                        <p className="text-muted-foreground font-bai mt-2">
                            {formConfig.description}
                        </p>
                    )}
                </div>

                {/* Progress */}
                <ProgressBar
                    current={answeredCount}
                    total={formConfig.questions.length}
                    className="mb-8"
                />

                {/* Question */}
                <div className="pir-form-question mb-8">
                    <div className="mb-4">
                        <span className="text-sm text-muted-foreground font-bai">
                            คำถามที่ {currentQuestionIndex + 1}
                        </span>
                        <h2 className="pir-form-label text-lg md:text-xl font-medium font-bai text-foreground mt-1">
                            {currentQuestion.label}
                            {currentQuestion.required && (
                                <span className="text-destructive ml-1">*</span>
                            )}
                        </h2>
                        {currentQuestion.description && (
                            <p className="pir-form-description text-sm text-muted-foreground font-bai mt-1">
                                {currentQuestion.description}
                            </p>
                        )}
                    </div>

                    {renderQuestionInput(currentQuestion)}

                    {validationErrors[currentQuestion.id] && (
                        <p className="text-sm text-destructive font-bai mt-2">
                            {validationErrors[currentQuestion.id]}
                        </p>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={goToPrevious}
                        disabled={isFirstQuestion}
                        className="font-bai"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        ก่อนหน้า
                    </Button>

                    {isLastQuestion ? (
                        <Button onClick={goToConfirmation} className="font-bai">
                            ตรวจสอบคำตอบ
                            <Check className="h-4 w-4 ml-1" />
                        </Button>
                    ) : (
                        <Button onClick={goToNext} className="font-bai">
                            ถัดไป
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                </div>

                {/* Question dots */}
                <div className="flex items-center justify-center gap-2 mt-8">
                    {formConfig.questions.map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => setCurrentQuestionIndex(index)}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                index === currentQuestionIndex
                                    ? "w-6 bg-primary"
                                    : formData[formConfig.questions[index].id]
                                        ? "bg-primary/50"
                                        : "bg-muted-foreground/30"
                            )}
                            aria-label={`Go to question ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
