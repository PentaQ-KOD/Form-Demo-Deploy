import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Check, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
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
    formMode?: 'single' | 'quiz';
    driveUrl?: string;  // Google Drive folder URL for file uploads
    senderEmail?: string;  // Email address for sender
    senderName?: string;   // Display name for sender
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
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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

            // Normalize formMode from n8n (handles "form mode" key and case-insensitive values)
            const rawFormMode = data.formMode || data['form mode'] || '';
            const normalizedFormMode = rawFormMode.toLowerCase() === 'quiz' ? 'quiz' : 'single';

            console.log('[FormPage] Raw form mode:', rawFormMode, '| Normalized:', normalizedFormMode);
            console.log('[FormPage] Full data from n8n:', data);

            setFormConfig({
                ...data,
                formMode: normalizedFormMode
            });

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

    // Update document title when form config is loaded
    useEffect(() => {
        if (formConfig?.title) {
            document.title = formConfig.title;
        }
        return () => {
            document.title = "PiR Form"; // Reset on unmount
        };
    }, [formConfig?.title]);

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

    // Validate current question only (for quiz mode)
    const validateCurrentQuestion = (): boolean => {
        if (!formConfig) return false;

        const question = formConfig.questions[currentQuestionIndex];
        const error = validateQuestion(question);

        if (error) {
            setValidationErrors(prev => ({ ...prev, [question.id]: error }));
            toast.error(error);
            return false;
        } else {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[question.id];
                return newErrors;
            });
            return true;
        }
    };

    // Quiz mode: Go to next question
    const handleNextQuestion = () => {
        if (!formConfig) return;

        if (!validateCurrentQuestion()) return;

        if (currentQuestionIndex < formConfig.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Quiz mode: Go to previous question
    const handlePrevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Quiz mode: Submit on last question
    const handleQuizSubmit = () => {
        if (!validateCurrentQuestion()) return;
        handleSubmit();
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
                drive_url: formConfig.driveUrl || '', // Google Drive folder URL
                sender_email: formConfig.senderEmail || '', // Sender email address
                sender_name: formConfig.senderName || '', // Sender display name
                submitted_at: new Date().toLocaleString('th-TH', {
                    timeZone: 'Asia/Bangkok',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
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
                const dropdownOptions = question.choices || question.options || [];
                const otherVariants = ["อื่นๆ", "อื่น ๆ", "อื่นๆ (โปรดระบุ)", "อื่น ๆ (โปรดระบุ)", "other", "Other", "Others", "อื่น"];
                const otherOption = dropdownOptions.find(opt =>
                    otherVariants.some(other => opt.toLowerCase().includes(other.toLowerCase()))
                );

                // Check if current value is "other" with custom text
                const isOtherSelected = otherOption && typeof value === "string" &&
                    (value === otherOption || value.startsWith(otherOption + ":"));
                const otherTextValue = isOtherSelected && typeof value === "string" && value.includes(":")
                    ? value.substring(value.indexOf(":") + 1).trim()
                    : "";

                return (
                    <div className="space-y-2">
                        <select
                            value={isOtherSelected ? otherOption : (typeof value === "string" ? value : "")}
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                if (otherOption && selectedValue === otherOption) {
                                    handleChange(question.id, otherOption);
                                } else {
                                    handleChange(question.id, selectedValue);
                                }
                            }}
                            style={{ paddingTop: '12px', paddingBottom: '12px' }}
                            className={cn(
                                "pir-form-input w-full h-12 md:h-13 px-4 rounded-lg border-2",
                                "font-bai text-sm md:text-base bg-background",
                                "focus:outline-none focus:ring-2 focus:ring-ring",
                                error ? "border-destructive" : "border-border"
                            )}
                        >
                            <option value="">{question.placeholder || "กรุณาเลือก..."}</option>
                            {dropdownOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>

                        {/* Show text input when "other" is selected */}
                        {isOtherSelected && (
                            <input
                                type="text"
                                value={otherTextValue}
                                onChange={(e) => {
                                    const text = e.target.value;
                                    if (text.trim()) {
                                        handleChange(question.id, `${otherOption}: ${text}`);
                                    } else {
                                        handleChange(question.id, otherOption || "");
                                    }
                                }}
                                placeholder="โปรดระบุ..."
                                className={cn(
                                    "pir-form-input w-full h-12 md:h-13 px-4 py-3 rounded-lg border-2",
                                    "font-bai text-sm md:text-base bg-background",
                                    "focus:outline-none focus:ring-2 focus:ring-ring",
                                    "border-border"
                                )}
                            />
                        )}
                    </div>
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
                                "pir-form-input w-full min-h-[100px] rounded-lg border-2 px-4 py-3",
                                "font-bai text-sm md:text-base resize-none leading-relaxed",
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
                            "pir-form-input h-12 md:h-13 text-sm md:text-base font-bai",
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
                            "pir-form-input h-12 md:h-13 text-sm md:text-base font-bai",
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
                            "pir-form-input h-12 md:h-13 text-sm md:text-base font-bai",
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
                            "pir-form-input h-12 md:h-13 text-sm md:text-base font-bai",
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

        // Extract user's name from form data
        const getUserName = (): string => {
            if (!formConfig) return "";

            // Try to find a name field from the questions
            // Look for questions with labels containing "ชื่อ" or "name" (case insensitive)
            const nameQuestion = formConfig.questions.find(q =>
                q.type === "text" &&
                (q.label.toLowerCase().includes("ชื่อ") ||
                    q.label.toLowerCase().includes("name"))
            );

            if (nameQuestion) {
                const name = formData[nameQuestion.id];
                if (name && typeof name === "string" && name.trim()) {
                    return name.trim();
                }
            }

            // If no specific name field found, try the first text question
            const firstTextQuestion = formConfig.questions.find(q => q.type === "text");
            if (firstTextQuestion) {
                const name = formData[firstTextQuestion.id];
                if (name && typeof name === "string" && name.trim()) {
                    return name.trim();
                }
            }

            return "";
        };

        const userName = getUserName();

        return (
            <div className="pir-form-container">
                <div className="flex items-center justify-center min-h-screen py-8 px-4">
                    <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 text-center space-y-6">
                        {/* Success Icon */}
                        <div className="flex justify-center">
                            <div className="relative">
                                {/* Decorative wave/hand illustration style */}
                                <svg
                                    className="w-20 h-20 text-primary"
                                    viewBox="0 0 80 80"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M40 10c-2 0-4 1-5 3l-10 25c-1 2 0 4 2 5s4 0 5-2l5-12v35c0 3 2 5 5 5s5-2 5-5V29l5 12c1 2 3 3 5 2s3-3 2-5L49 13c-1-2-3-3-5-3h-4z"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                    <circle cx="25" cy="20" r="3" fill="#facc15" />
                                    <circle cx="55" cy="25" r="2" fill="#a855f7" />
                                    <circle cx="60" cy="50" r="4" fill="#facc15" />
                                    <circle cx="20" cy="55" r="2" fill="#a855f7" />
                                </svg>
                            </div>
                        </div>

                        {/* Success Message */}
                        <div className="space-y-2">
                            <h2 className="text-2xl md:text-3xl font-bold font-bai text-foreground">
                                {userName ? `ขอบคุณ คุณ${userName}` : "ส่งข้อมูลเรียบร้อยแล้ว!"}
                            </h2>
                            <p className="text-muted-foreground font-bai">
                                เราได้รับข้อมูลของคุณแล้ว และจะติดต่อกลับโดยเร็วที่สุด
                            </p>
                        </div>

                        {/* Decorative divider */}
                        <div className="flex items-center justify-center gap-2 py-2">
                            <div className="h-1 w-1 rounded-full bg-primary/30" />
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                            <div className="h-1 w-1 rounded-full bg-primary/30" />
                        </div>

                        {/* Action Button */}
                        <Button
                            onClick={() => navigate("/")}
                            variant="outline"
                            className="font-bai px-6 py-2 rounded-full border-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                            กลับหน้าหลัก
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
        <div className="pir-form-container min-h-screen py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Main Card Container */}
                <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-border/50">
                        <h1 className="text-xl md:text-2xl font-bold font-bai text-foreground text-center">
                            {formConfig.title}
                        </h1>
                        {formConfig.description && (
                            <p className="text-muted-foreground font-bai mt-2 text-center text-sm md:text-base">
                                {formConfig.description}
                            </p>
                        )}

                        {/* Quiz Mode Progress Indicator */}
                        {formConfig.formMode === 'quiz' && (
                            <div className="mt-6">
                                {/* Progress Dots */}
                                <div className="flex justify-center items-center gap-2">
                                    {formConfig.questions.map((_, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                // Allow going to previous questions without validation
                                                if (index < currentQuestionIndex) {
                                                    setCurrentQuestionIndex(index);
                                                }
                                            }}
                                            className={cn(
                                                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                                index === currentQuestionIndex
                                                    ? "bg-primary w-8"
                                                    : index < currentQuestionIndex
                                                        ? "bg-primary/60 cursor-pointer hover:bg-primary/80"
                                                        : "bg-muted-foreground/30"
                                            )}
                                        />
                                    ))}
                                </div>
                                {/* Progress Text */}
                                <p className="text-center text-sm text-muted-foreground font-bai mt-3">
                                    ข้อที่ {currentQuestionIndex + 1} จาก {formConfig.questions.length}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Quiz Mode View */}
                    {formConfig.formMode === 'quiz' ? (
                        <div className="p-6 md:p-8">
                            {/* Current Question */}
                            {(() => {
                                const question = formConfig.questions[currentQuestionIndex];
                                return (
                                    <div
                                        key={question.id}
                                        id={`question-${question.id}`}
                                        className={cn(
                                            "p-4 md:p-5 rounded-xl border transition-all duration-200",
                                            validationErrors[question.id]
                                                ? "border-destructive/50 bg-destructive/5"
                                                : "border-border/50 bg-muted/20"
                                        )}
                                    >
                                        <div className="mb-4">
                                            <h2 className="text-lg md:text-xl font-medium font-bai text-foreground flex items-center gap-2">
                                                {question.label}
                                                {question.required && (
                                                    <span className="text-xs text-destructive font-normal">(จำเป็น)</span>
                                                )}
                                            </h2>
                                            {question.description && (
                                                <p className="text-sm text-muted-foreground font-bai mt-2">
                                                    {question.description}
                                                </p>
                                            )}
                                        </div>

                                        {renderQuestionInput(question)}

                                        {validationErrors[question.id] && (
                                            <p className="text-sm text-destructive font-bai mt-3 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                {validationErrors[question.id]}
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between mt-6 gap-4">
                                {/* Previous Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePrevQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    className={cn(
                                        "h-12 px-6 font-bai rounded-full transition-all",
                                        currentQuestionIndex === 0 && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <ChevronLeft className="h-5 w-5 mr-1" />
                                    ย้อนกลับ
                                </Button>

                                {/* Next / Submit Button */}
                                {currentQuestionIndex === formConfig.questions.length - 1 ? (
                                    <Button
                                        type="button"
                                        onClick={handleQuizSubmit}
                                        className="h-12 px-8 font-bai rounded-full bg-primary hover:bg-primary/90 transition-all hover:shadow-lg"
                                    >
                                        <Check className="h-5 w-5 mr-2" />
                                        ส่งคำตอบ
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleNextQuestion}
                                        className="h-12 px-8 font-bai rounded-full bg-primary hover:bg-primary/90 transition-all hover:shadow-lg"
                                    >
                                        ถัดไป
                                        <ChevronRight className="h-5 w-5 ml-1" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Single Page Mode (Default) */
                        <form onSubmit={onFormSubmit} className="p-6 md:p-8 space-y-6">
                            {/* All Questions */}
                            {formConfig.questions.map((question, index) => (
                                <div
                                    key={question.id}
                                    id={`question-${question.id}`}
                                    className={cn(
                                        "p-4 md:p-5 rounded-xl border transition-all duration-200",
                                        validationErrors[question.id]
                                            ? "border-destructive/50 bg-destructive/5"
                                            : "border-border/50 bg-muted/20 hover:bg-muted/30"
                                    )}
                                >
                                    <div className="mb-3">
                                        <h2 className="text-base md:text-lg font-medium font-bai text-foreground flex items-center gap-2">
                                            {question.label}
                                            {question.required && (
                                                <span className="text-xs text-destructive font-normal">(จำเป็น)</span>
                                            )}
                                        </h2>
                                        {question.description && (
                                            <p className="text-sm text-muted-foreground font-bai mt-1">
                                                {question.description}
                                            </p>
                                        )}
                                    </div>

                                    {renderQuestionInput(question)}

                                    {validationErrors[question.id] && (
                                        <p className="text-sm text-destructive font-bai mt-2 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
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
                                    className="w-full h-12 md:h-14 text-base md:text-lg font-bai rounded-full bg-primary hover:bg-primary/90 transition-all hover:shadow-lg"
                                >
                                    <Check className="h-5 w-5 mr-2" />
                                    ส่งคำตอบ
                                </Button>
                                <p className="text-center text-xs text-muted-foreground font-bai mt-3">
                                    กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนกดส่ง
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Floating Logo - Bottom Left */}
            {formConfig.logoUrl && (
                <div className="fixed bottom-4 left-4 z-50">
                    <div className="bg-card rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow duration-300">
                        <img
                            src={formConfig.logoUrl}
                            alt="Logo"
                            className="h-8 md:h-10 object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
