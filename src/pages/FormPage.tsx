import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Check, Upload, X } from "lucide-react";
import { StarRating, ChoiceField } from "@/components/form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Question types from Google Sheets schema
interface Question {
    id: string;
    type: "choices" | "text" | "phone" | "email" | "rating" | "file" | "date" | "dropdown";
    label: string;
    description?: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    choices?: string[]; // Alternative to options (for compatibility)
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
    logoUrl?: string;
    successUrl?: string;
    notifyEmails?: string;
    slackWebhook?: string;
    responseSheet?: string;
}

type FormState = "loading" | "error" | "form" | "submitting" | "thankyou";

const FETCH_URL = import.meta.env.VITE_FORM_FETCH_URL || "https://auto.pirsquare.net/webhook-test/pir/form";
const SUBMIT_URL = import.meta.env.VITE_FORM_SUBMIT_URL || "https://auto.pirsquare.net/webhook-test/pir/form/submit";

export default function FormPage() {
    const { formId } = useParams<{ formId: string }>();
    const navigate = useNavigate();

    const [formState, setFormState] = useState<FormState>("loading");
    const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
    const [formData, setFormData] = useState<Record<string, string | string[] | number | File | null>>({});
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

    // Handle input change with real-time validation
    const handleChange = (questionId: string, value: string | string[] | number | File | null) => {
        setFormData((prev) => ({ ...prev, [questionId]: value }));

        // Real-time validation for email and phone
        if (formConfig) {
            const question = formConfig.questions.find(q => q.id === questionId);
            if (question && (question.type === "email" || question.type === "phone")) {
                // Only validate if there's a value (don't show error for empty fields while typing)
                if (value && typeof value === "string" && value.length > 0) {
                    const error = validateQuestionValue(question, value);
                    if (error) {
                        setValidationErrors((prev) => ({ ...prev, [questionId]: error }));
                    } else {
                        // Clear error if valid
                        setValidationErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors[questionId];
                            return newErrors;
                        });
                    }
                } else {
                    // Clear error when field is empty (required check happens on submit)
                    setValidationErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[questionId];
                        return newErrors;
                    });
                }
            } else {
                // Clear validation error for other types when user starts typing
                if (validationErrors[questionId]) {
                    setValidationErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[questionId];
                        return newErrors;
                    });
                }
            }
        }
    };

    // Validate only format (email/phone) without required check - for real-time validation
    const validateQuestionValue = (question: Question, value: string): string | null => {
        // Email validation
        if (question.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return "รูปแบบอีเมลไม่ถูกต้อง";
            }
        }

        // Phone validation (Thai format)
        if (question.type === "phone") {
            const digitsOnly = value.replace(/\D/g, "");

            // Check if input contains mostly non-digit characters (invalid)
            if (digitsOnly.length === 0 && value.length > 0) {
                return "กรุณากรอกเฉพาะตัวเลข";
            }

            // Check max 10 digits
            if (digitsOnly.length > 10) {
                return "เบอร์โทรต้องไม่เกิน 10 หลัก";
            }

            // Check if starts with 0 (Thai phone numbers must start with 0)
            if (digitsOnly.length > 0 && !digitsOnly.startsWith("0")) {
                return "เบอร์โทรต้องเริ่มต้นด้วย 0";
            }

            // Validate format when user has entered enough digits
            if (digitsOnly.length >= 9) {
                const thaiMobileRegex = /^0[689]\d{8}$/;
                const thaiLandlineRegex = /^0[2-7]\d{7}$/;

                if (!thaiMobileRegex.test(digitsOnly) && !thaiLandlineRegex.test(digitsOnly)) {
                    return "รูปแบบเบอร์โทรไม่ถูกต้อง (เช่น 08x-xxx-xxxx หรือ 02-xxx-xxxx)";
                }
            }
        }

        return null;
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

        // Phone validation (Thai format)
        if (question.type === "phone" && value && typeof value === "string") {
            // Remove all non-digit characters for validation
            const digitsOnly = value.replace(/\D/g, "");

            // Check max 10 digits
            if (digitsOnly.length > 10) {
                return "เบอร์โทรต้องไม่เกิน 10 หลัก";
            }

            // Thai phone formats:
            // - Mobile: 06x, 08x, 09x (10 digits)
            // - Landline Bangkok: 02xxxxxxx (9 digits)
            // - Landline Other: 0xxyyyyyyy (9 digits, xx = 32-77)
            const thaiMobileRegex = /^0[689]\d{8}$/;
            const thaiLandlineRegex = /^0[2-7]\d{7}$/;

            if (!thaiMobileRegex.test(digitsOnly) && !thaiLandlineRegex.test(digitsOnly)) {
                return "รูปแบบเบอร์โทรไม่ถูกต้อง (เช่น 08x-xxx-xxxx หรือ 02-xxx-xxxx)";
            }
        }

        return null;
    };

    // Validate all questions and scroll to first error
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

        // Scroll to first error if any
        if (Object.keys(errors).length > 0) {
            const firstErrorId = Object.keys(errors)[0];
            const element = document.getElementById(`question-${firstErrorId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
        }

        return Object.keys(errors).length === 0;
    };

    // Helper function to convert File to Base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
    };

    // Submit form
    const handleSubmit = async () => {
        if (!formConfig) return;

        setFormState("submitting");

        try {
            // Prepare answers (convert Files to Base64 with metadata)
            const answers: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(formData)) {
                if (value instanceof File) {
                    const base64 = await fileToBase64(value);
                    answers[key] = {
                        filename: value.name,
                        mimeType: value.type,
                        size: value.size,
                        base64: base64
                    };
                } else {
                    answers[key] = value;
                }
            }

            const payload = {
                form_id: formId,
                form_title: formConfig.title,
                answers,
                questions: formConfig.questions, // For email type detection
                notify_emails: formConfig.notifyEmails || '', // Admin emails  
                slack_webhook: formConfig.slackWebhook || '', // Slack webhook
                response_sheet: formConfig.responseSheet || '', // Response sheet URL
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
            setFormState("form");
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
                        options={question.choices || question.options || []}
                        value={value as string | string[]}
                        onChange={(v) => handleChange(question.id, v)}
                        multiple={question.multiple}
                    />
                );

            case "dropdown":
                return (
                    <select
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        className={cn(
                            "pir-form-input w-full h-12 md:h-14 px-4 rounded-lg border-2",
                            "font-bai text-base md:text-lg bg-background",
                            "focus:outline-none focus:ring-2 focus:ring-ring",
                            error ? "border-destructive" : "border-border"
                        )}
                    >
                        <option value="">{question.placeholder || "กรุณาเลือก..."}</option>
                        {(question.choices || question.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
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
        // If successUrl is set, redirect immediately
        if (formConfig?.successUrl) {
            window.location.href = formConfig.successUrl;
            return (
                <div className="pir-form-container">
                    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground font-bai">กำลังเปลี่ยนหน้า...</p>
                    </div>
                </div>
            );
        }

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

    // Form state - Single page form
    if (!formConfig) return null;

    // Handle form submission
    const onFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateAll()) {
            handleSubmit();
        }
    };

    return (
        <div className="pir-form-container">
            <div className="max-w-2xl mx-auto py-6 px-4">
                {/* Header */}
                <div className="mb-8">
                    {/* Logo */}
                    {formConfig.logoUrl && (
                        <div className="flex justify-center mb-6">
                            <img
                                src={formConfig.logoUrl}
                                alt="Logo"
                                className="h-12 md:h-16 object-contain"
                            />
                        </div>
                    )}
                    <h1 className="text-2xl md:text-3xl font-bold font-bai text-foreground">
                        {formConfig.title}
                    </h1>
                    {formConfig.description && (
                        <p className="text-muted-foreground font-bai mt-2">
                            {formConfig.description}
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={onFormSubmit} className="space-y-8">
                    {/* All Questions */}
                    {formConfig.questions.map((question, index) => (
                        <div
                            key={question.id}
                            id={`question-${question.id}`}
                            className={cn(
                                "pir-form-question p-6 rounded-xl border-2 transition-colors",
                                validationErrors[question.id]
                                    ? "border-destructive/50 bg-destructive/5"
                                    : "border-border bg-card"
                            )}
                        >
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full font-bai">
                                        {index + 1} / {formConfig.questions.length}
                                    </span>
                                    {question.required && (
                                        <span className="text-xs text-destructive font-bai">จำเป็น</span>
                                    )}
                                </div>
                                <h2 className="pir-form-label text-lg md:text-xl font-medium font-bai text-foreground">
                                    {question.label}
                                </h2>
                                {question.description && (
                                    <p className="pir-form-description text-sm text-muted-foreground font-bai mt-1">
                                        {question.description}
                                    </p>
                                )}
                            </div>

                            {renderQuestionInput(question)}

                            {validationErrors[question.id] && (
                                <p className="text-sm text-destructive font-bai mt-2 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    {validationErrors[question.id]}
                                </p>
                            )}
                        </div>
                    ))}

                    {/* Submit Button */}
                    <div className="pt-4">
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full h-14 text-lg font-bai rounded-xl"
                        >
                            <Check className="h-5 w-5 mr-2" />
                            ส่งคำตอบ
                        </Button>
                        <p className="text-center text-sm text-muted-foreground font-bai mt-3">
                            กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนกดส่ง
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
