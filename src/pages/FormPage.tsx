import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Check, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { StarRating, ChoiceField } from "@/components/form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


// Question types from Google Sheets schema
interface Question {
    id: string;
    type: "choices" | "text" | "phone" | "email" | "rating" | "file" | "date" | "dropdown" | "image" | "consent" | "slider";
    label: string;
    description?: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    choices?: string[]; // Alternative to options (for compatibility)
    multiple?: boolean; // For choices (multiple selection) and file (multiple file upload)
    multiline?: boolean;
    maxRating?: number;
    accept?: string;
    maxSize?: number;
    fullWidth?: boolean; // If true, question spans full width in 2-column layout
    // Slider properties
    min?: number;
    max?: number;
    step?: number;
    section?: string; // Section header to group questions
}

interface SuccessPageConfig {
    title?: string;  // Custom title (supports markdown)
    message?: string;  // Custom message (supports markdown)
    showIcon?: boolean;  // Whether to show the checkmark icon (default: true)
    iconColor?: string;  // Icon color (default: "green")
}

interface FormConfig {
    title: string;
    description: string;
    questions: Question[];
    logoUrl?: string;
    logos?: (string | { url: string; height?: number | string })[]; // Support for multiple logos with optional custom height
    successUrl?: string;
    successPage?: SuccessPageConfig;  // Custom success page configuration
    notifyEmails?: string;
    slackChannel?: string;
    responseSheet?: string;
    formMode?: 'single' | 'full-page';
    driveUrl?: string;  // Google Drive folder URL for file uploads
    emailCredential?: string;  // Email credential identifier (e.g., "pooh", "pir")
}

type FormState = "loading" | "error" | "form" | "submitting" | "thankyou";

const FETCH_URL = import.meta.env.VITE_FORM_FETCH_URL || "https://auto.pirsquare.net/webhook-test/pir/form";
const SUBMIT_URL = import.meta.env.VITE_FORM_SUBMIT_URL || "https://auto.pirsquare.net/webhook-test/pir/form/submit";

export default function FormPage() {
    const { formId } = useParams<{ formId: string }>();
    const navigate = useNavigate();

    const [formState, setFormState] = useState<FormState>("loading");
    const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
    const [formData, setFormData] = useState<Record<string, string | string[] | number | File | File[] | null | boolean>>({});
    const [errorMessage, setErrorMessage] = useState("");
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

    // Fetch form configuration
    const fetchFormConfig = async () => {
        if (!formId) {
            setErrorMessage("Form ID is required");
            setFormState("error");
            return;
        }

        setFormState("loading");
        setErrorMessage("");
        setCurrentQuestionIndex(0);
        setCurrentSectionIndex(0);

        try {
            // Override for development/testing with local file


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
            const normalizedFormMode = rawFormMode.toLowerCase() === 'full-page' || rawFormMode.toLowerCase() === 'fullpage'
                ? 'full-page'
                : 'single'; // Default to 'single' (step-by-step mode)

            console.log('[FormPage] Raw form mode:', rawFormMode, '| Normalized:', normalizedFormMode);
            console.log('[FormPage] Full data from n8n:', data);

            setFormConfig({
                ...data,
                formMode: normalizedFormMode
            });

            // Initialize form data
            const initialData: Record<string, string | string[] | number | File | File[] | null | boolean> = {};
            data.questions.forEach((q: Question) => {
                if (q.type === "choices" && q.multiple) {
                    initialData[q.id] = [];
                } else if (q.type === "rating") {
                    initialData[q.id] = 0;
                } else if (q.type === "file") {
                    // Support multiple file uploads
                    initialData[q.id] = q.multiple ? [] : null;
                } else if (q.type === "consent") {
                    initialData[q.id] = false;
                } else if (q.type === "slider") {
                    initialData[q.id] = q.min || 0;
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
    const handleChange = (questionId: string, value: string | string[] | number | File | File[] | null | boolean) => {
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
                if (question.multiple) {
                    if (!Array.isArray(value) || value.length === 0) {
                        return "กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์";
                    }
                } else {
                    if (!value) {
                        return "กรุณาอัปโหลดไฟล์";
                    }
                }
            } else if (question.type === "consent") {
                if (value !== true) {
                    return "กรุณายอมรับข้อตกลง";
                }
            } else if (question.type === "slider") {
                if (typeof value !== "number") {
                    return "กรุณาปรับค่า";
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

    // Validate questions in the current section
    const validateSection = (sectionName: string): boolean => {
        if (!formConfig) return false;

        const sectionQuestions = formConfig.questions.filter(q => q.section === sectionName);
        const errors: Record<string, string> = {};

        sectionQuestions.forEach(q => {
            const error = validateQuestion(q);
            if (error) {
                errors[q.id] = error;
            }
        });

        if (Object.keys(errors).length > 0) {
            setValidationErrors(prev => ({ ...prev, ...errors }));

            // Scroll to first error
            const firstErrorId = Object.keys(errors)[0];
            const element = document.getElementById(`question-${firstErrorId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return false;
        }

        return true;
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
                } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
                    // Handle multiple files
                    const filesData = await Promise.all(
                        (value as File[]).map(async (file: File) => {
                            const base64 = await fileToBase64(file);
                            return {
                                filename: file.name,
                                mimeType: file.type,
                                size: file.size,
                                base64: base64
                            };
                        })
                    );
                    answers[key] = filesData;
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
                slack_channel: formConfig.slackChannel || '', // Slack channel
                response_sheet: formConfig.responseSheet || '', // Response sheet URL
                drive_url: formConfig.driveUrl || '', // Google Drive folder URL
                email_credential: formConfig.emailCredential || '', // Email credential identifier
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
                        variant={(question as any).variant || "default"}
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
                            className={cn(
                                "pir-form-input w-full font-bai",
                                error && "ring-1 ring-destructive"
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
                                className="pir-form-input w-full font-bai"
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
                                "pir-form-input w-full min-h-[80px] font-bai resize-none",
                                error && "ring-1 ring-destructive"
                            )}
                            rows={3}
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
                            "pir-form-input font-bai",
                            error && "ring-1 ring-destructive"
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
                            "pir-form-input font-bai",
                            error && "ring-1 ring-destructive"
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
                            "pir-form-input font-bai",
                            error && "ring-1 ring-destructive"
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
                            "pir-form-input font-bai",
                            error && "ring-1 ring-destructive"
                        )}
                    />
                );

            case "file":
                // Support both single and multiple file uploads
                const files = question.multiple
                    ? (Array.isArray(value) ? value as File[] : [])
                    : (value instanceof File ? [value] : []);

                return (
                    <div className="space-y-2">
                        <label
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-32",
                                "rounded-lg cursor-pointer bg-muted/10",
                                "hover:bg-muted/20 transition-colors",
                                error && "bg-destructive/10"
                            )}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground font-bai">
                                    {question.multiple
                                        ? "คลิกเพื่ออัปโหลดไฟล์ (หลายไฟล์)"
                                        : "คลิกเพื่ออัปโหลดไฟล์"}
                                </p>
                                {question.accept && (
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        รองรับ: {question.accept}
                                    </p>
                                )}
                                {question.maxSize && (
                                    <p className="text-xs text-muted-foreground/70">
                                        ขนาดสูงสุด: {question.maxSize}MB {question.multiple ? "ต่อไฟล์" : ""}
                                    </p>
                                )}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept={question.accept}
                                multiple={question.multiple}
                                onChange={(e) => {
                                    const selectedFiles = Array.from(e.target.files || []);

                                    // Validate file sizes
                                    if (question.maxSize) {
                                        const maxBytes = question.maxSize * 1024 * 1024;
                                        const oversizedFile = selectedFiles.find(f => f.size > maxBytes);
                                        if (oversizedFile) {
                                            toast.error(`ไฟล์ ${oversizedFile.name} มีขนาดเกิน ${question.maxSize}MB`);
                                            return;
                                        }
                                    }

                                    if (question.multiple) {
                                        // Add to existing files
                                        const currentFiles = Array.isArray(value) ? value as File[] : [];
                                        handleChange(question.id, [...currentFiles, ...selectedFiles]);
                                    } else {
                                        handleChange(question.id, selectedFiles[0] || null);
                                    }

                                    // Reset input so same file can be selected again
                                    e.target.value = '';
                                }}
                            />
                        </label>
                        {files.length > 0 && (
                            <div className="space-y-2">
                                {files.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                        <span className="text-sm font-bai flex-1 truncate">
                                            {file.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {(file.size / 1024).toFixed(1)}KB
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (question.multiple) {
                                                    const newFiles = files.filter((_, i) => i !== index);
                                                    handleChange(question.id, newFiles.length > 0 ? newFiles : []);
                                                } else {
                                                    handleChange(question.id, null);
                                                }
                                            }}
                                            className="p-1 hover:bg-destructive/20 rounded"
                                        >
                                            <X className="h-4 w-4 text-destructive" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case "slider":
                const sliderValue = typeof value === "number" ? value : (question.min || 0);
                const sliderMin = question.min || 0;
                const sliderMax = question.max || 100;
                const sliderStep = question.step || 1;

                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground font-bai">{sliderMin}</span>
                            <span className="text-lg font-semibold font-bai text-primary">{sliderValue}</span>
                            <span className="text-sm text-muted-foreground font-bai">{sliderMax}</span>
                        </div>
                        <input
                            type="range"
                            min={sliderMin}
                            max={sliderMax}
                            step={sliderStep}
                            value={sliderValue}
                            onChange={(e) => handleChange(question.id, Number(e.target.value))}
                            className={cn(
                                "w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer",
                                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5",
                                "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
                                "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all",
                                "[&::-webkit-slider-thumb]:hover:scale-110",
                                "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full",
                                "[&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0",
                                "[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-all",
                                "[&::-moz-range-thumb]:hover:scale-110",
                                error && "bg-destructive/20"
                            )}
                            style={{
                                background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100}%, hsl(var(--muted)) ${((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100}%, hsl(var(--muted)) 100%)`
                            }}
                        />
                    </div>
                );

            case "image":
                // Display image - no input needed, just visual content
                return (
                    <div className="flex justify-center">
                        <img
                            src={(question as any).imageUrl || (question as any).url}
                            alt={(question as any).alt || question.label || "Image"}
                            className="max-w-full h-auto rounded-lg"
                        />
                    </div>
                );

            case "consent":
                // Consent checkbox
                const isChecked = value === true;
                // Use first choice as text if available, otherwise use label
                const consentText = (question.choices && question.choices.length > 0)
                    ? question.choices[0]
                    : question.label;

                return (
                    <div
                        onClick={() => handleChange(question.id, !isChecked)}
                        className={cn(
                            "flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-muted/30",
                            isChecked
                                ? "border-primary bg-primary/5"
                                : "border-border",
                            error && "border-destructive bg-destructive/5"
                        )}
                    >
                        <button
                            type="button"
                            className={cn(
                                "flex-shrink-0 w-6 h-6 rounded border-2 transition-all duration-200",
                                "flex items-center justify-center mt-0.5",
                                isChecked
                                    ? "bg-primary border-primary"
                                    : "bg-background border-muted-foreground/30",
                            )}
                            role="checkbox"
                            aria-checked={isChecked}
                        >
                            {isChecked && (
                                <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
                            )}
                        </button>
                        <div className="flex-1">
                            <label className="text-base font-bai cursor-pointer select-none leading-relaxed text-foreground">
                                {consentText}
                            </label>
                        </div>
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

        // Check if custom success page is configured
        const successPageConfig = formConfig?.successPage;
        const hasCustomConfig = successPageConfig && (successPageConfig.title || successPageConfig.message);

        // Extract user's name from form data (for default page)
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

            // If no name field found, try to extract name from email address
            const emailQuestion = formConfig.questions.find(q => q.type === "email");
            if (emailQuestion) {
                const email = formData[emailQuestion.id];
                if (email && typeof email === "string" && email.trim()) {
                    // Extract the part before @ and capitalize it
                    const emailName = email.split("@")[0];
                    // Only return if it's reasonable length (not too long, likely a name)
                    if (emailName.length > 0 && emailName.length <= 30) {
                        return emailName;
                    }
                }
            }

            // Don't fallback to other text fields (they might be long feedback text)
            return "";
        };

        const userName = getUserName();

        // Default icon settings
        const showIcon = successPageConfig?.showIcon !== false; // Default to true
        const iconColor = successPageConfig?.iconColor || "green";
        const iconBgColor = iconColor === "green" ? "bg-green-100" : `bg-${iconColor}-100`;
        const iconTextColor = iconColor === "green" ? "text-green-600" : `text-${iconColor}-600`;

        return (
            <div className="pir-form-container">
                <div className="flex items-center justify-center min-h-screen py-8 px-4">
                    <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 text-center space-y-6">
                        {/* Success Icon */}
                        {showIcon && (
                            <div className="flex justify-center mb-6">
                                <div className={cn(
                                    "rounded-full p-6 animate-in zoom-in-50 duration-300",
                                    iconBgColor
                                )}>
                                    <Check className={cn("h-20 w-20", iconTextColor)} strokeWidth={3} />
                                </div>
                            </div>
                        )}

                        {/* Custom or Default Success Message */}
                        {hasCustomConfig ? (
                            // Custom success page with markdown support
                            <div className="space-y-4">
                                {successPageConfig.title && (
                                    <div className="text-2xl md:text-3xl font-bold font-bai text-foreground text-balance break-words leading-tight">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ node, ...props }) => <span {...props} />,
                                                a: ({ node, ...props }) => <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />,
                                            }}
                                        >
                                            {successPageConfig.title}
                                        </ReactMarkdown>
                                    </div>
                                )}
                                {successPageConfig.message && (
                                    <div className="text-muted-foreground font-bai prose prose-sm max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                a: ({ node, ...props }) => <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />,
                                                ul: ({ node, ...props }) => <ul {...props} className="list-disc list-inside text-left space-y-1" />,
                                                ol: ({ node, ...props }) => <ol {...props} className="list-decimal list-inside text-left space-y-1" />,
                                                li: ({ node, ...props }) => <li {...props} className="text-muted-foreground" />,
                                                p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                                            }}
                                        >
                                            {successPageConfig.message}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Default success page
                            <>
                                <div className="space-y-2">
                                    <h2 className="text-2xl md:text-3xl font-bold font-bai text-foreground text-balance break-words leading-tight">
                                        {userName ? (
                                            <>
                                                ขอบคุณ <span className="inline-block">คุณ{userName}</span>
                                            </>
                                        ) : (
                                            "ส่งข้อมูลเรียบร้อยแล้ว!"
                                        )}
                                    </h2>
                                    <p className="text-muted-foreground font-bai">
                                        เราได้รับข้อมูลของคุณแล้ว
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
                            </>
                        )}

                        {/* Action Button */}
                        {/*<Button
                            onClick={() => navigate("/")}
                            variant="outline"
                            className="font-bai px-6 py-2 rounded-full border-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                            กลับหน้าหลัก
                        </Button>*/}
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
                    <div className="p-6 md:p-8 border-b border-border">
                        {/* Header Logos */}
                        {formConfig.logos && formConfig.logos.length > 0 && (
                            <div className="flex justify-center items-center gap-8 mb-2">
                                {formConfig.logos.map((logo, index) => {
                                    const url = typeof logo === 'string' ? logo : logo.url;
                                    // Default height is 100px if not specified
                                    let height = '100px';
                                    if (typeof logo !== 'string' && logo.height) {
                                        height = typeof logo.height === 'number' ? `${logo.height}px` : logo.height;
                                    }

                                    return (
                                        <img
                                            key={index}
                                            src={url}
                                            alt={`Header Logo ${index + 1}`}
                                            style={{ height }}
                                            className="object-contain"
                                        />
                                    );
                                })}
                            </div>
                        )}
                        {(() => {
                            // Check for sections to determine which progress indicator to show
                            const hasSections = formConfig.questions.some(q => !!q.section);

                            return (
                                <>
                                    <h1 className="text-2xl md:text-3xl font-bold font-bai text-foreground text-center leading-tight whitespace-pre-line">
                                        {formConfig.title}
                                    </h1>
                                    {formConfig.description && (
                                        <p className="text-muted-foreground font-bai mt-3 text-center text-base md:text-lg max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
                                            {formConfig.description}
                                        </p>
                                    )}

                                    {/* Single Mode (Step-by-step) Progress Indicator - ONLY show if NO sections */}
                                    {formConfig.formMode === 'single' && !hasSections && (
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
                                </>
                            );
                        })()}
                    </div>

                    {/* Single Mode (Step-by-step) View */}
                    {formConfig.formMode === 'single' ? (
                        <div className="p-6 md:p-8">
                            {(() => {
                                // 1. Check for Sections Data
                                const hasSections = formConfig.questions.some(q => !!q.section);

                                // --- CASE A: SECTION WIZARD (Single Mode + Sections) ---
                                if (hasSections) {
                                    // Get unique sections
                                    const sections = Array.from(new Set(formConfig.questions.map(q => q.section || 'General')));
                                    const currentSection = sections[currentSectionIndex];
                                    const currentQuestions = formConfig.questions.filter(q => (q.section || 'General') === currentSection);

                                    // Check if current section has required fields
                                    const isSectionRequired = currentQuestions.some(q => q.required);

                                    const handleNextSection = () => {
                                        if (validateSection(currentSection)) {
                                            setCurrentSectionIndex(prev => prev + 1);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    };

                                    const handlePrevSection = () => {
                                        if (currentSectionIndex > 0) {
                                            setCurrentSectionIndex(prev => prev - 1);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    };

                                    // If last section, wrapped in form to handle submit on enter (optional) or button click
                                    const isLastSection = currentSectionIndex === sections.length - 1;

                                    return (
                                        <div className="space-y-6">
                                            {/* Section Header */}
                                            <div className="pb-4 border-b border-border mb-6">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h2 className="text-xl md:text-2xl font-bold font-bai text-primary">
                                                        {currentSection}
                                                    </h2>
                                                    {isSectionRequired && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive font-bai border border-destructive/20">
                                                            Required
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {sections.map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                "h-1.5 rounded-full flex-1 transition-all duration-300",
                                                                idx <= currentSectionIndex ? "bg-primary" : "bg-muted"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-right text-xs text-muted-foreground mt-1.5 font-bai">
                                                    ส่วนที่ {currentSectionIndex + 1} จาก {sections.length}
                                                </p>
                                            </div>

                                            {/* Questions in Section */}
                                            {currentQuestions.map((question) => (
                                                <div
                                                    key={question.id}
                                                    id={`question-${question.id}`}
                                                    className="space-y-2.5"
                                                >
                                                    {/* Label without required marker (moved to section header) */}
                                                    {question.label && (question.type !== 'consent' || (question.choices && question.choices.length > 0)) && (
                                                        <label className="pir-form-label font-bai block whitespace-pre-line">
                                                            <span className="text-base md:text-lg">{question.label}</span>
                                                        </label>
                                                    )}

                                                    {/* Description */}
                                                    {question.description && (
                                                        <p className="pir-form-description font-bai">
                                                            {question.description}
                                                        </p>
                                                    )}

                                                    {/* Input */}
                                                    {renderQuestionInput(question)}

                                                    {/* Validation Error */}
                                                    {validationErrors[question.id] && (
                                                        <p className="text-sm text-destructive font-bai mt-2 flex items-center gap-1.5">
                                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                            {validationErrors[question.id]}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Navigation Buttons for Sections */}
                                            <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handlePrevSection}
                                                    disabled={currentSectionIndex === 0}
                                                    className={cn(
                                                        "h-12 px-6 font-bai rounded-full transition-all",
                                                        currentSectionIndex === 0 && "opacity-0 pointer-events-none"
                                                    )}
                                                >
                                                    <ChevronLeft className="h-5 w-5 mr-1" />
                                                    ย้อนกลับ
                                                </Button>

                                                {isLastSection ? (
                                                    <Button
                                                        type="button"
                                                        onClick={() => {
                                                            if (validateSection(currentSection)) {
                                                                handleSubmit();
                                                            }
                                                        }}
                                                        size="lg"
                                                        className="h-12 md:h-14 px-8 text-base md:text-lg font-bai rounded-full bg-primary hover:bg-primary/90 transition-all hover:shadow-lg"
                                                    >
                                                        <Check className="h-5 w-5 mr-2" />
                                                        ส่งคำตอบ
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        onClick={handleNextSection}
                                                        size="lg"
                                                        className="h-12 md:h-14 px-8 text-base md:text-lg font-bai rounded-full bg-primary hover:bg-primary/90 transition-all hover:shadow-lg"
                                                    >
                                                        ถัดไป
                                                        <ChevronRight className="h-5 w-5 ml-1" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                // --- CASE B: QUESTION WIZARD (Single Mode + NO Sections) ---
                                // Standard Step-by-Step Question
                                const question = formConfig.questions[currentQuestionIndex];
                                return (
                                    <>
                                        <div
                                            key={question.id}
                                            id={`question-${question.id}`}
                                            className={cn(
                                                "p-4 md:p-5 transition-all duration-200",
                                                validationErrors[question.id]
                                                    ? "bg-destructive/5"
                                                    : ""
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
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        /* Full-page Mode (All questions on one page) */
                        <form onSubmit={onFormSubmit} className="p-6 md:p-8">
                            {/* All Questions - Single Column Layout */}
                            <div className="space-y-6">
                                {formConfig.questions.map((question, index) => (
                                    <div
                                        key={question.id}
                                        id={`question-${question.id}`}
                                        className="space-y-2.5"
                                    >
                                        {/* Section Header */}
                                        {/* Show section header if defined and different from previous */}
                                        {(index === 0 || question.section !== formConfig.questions[index - 1].section) && question.section && (
                                            <div className="pt-4 pb-2">
                                                <h3 className="text-xl md:text-2xl font-bold font-bai text-primary">
                                                    {question.section}
                                                </h3>
                                                <div className="h-1 w-20 bg-primary/20 rounded-full mt-2" />
                                            </div>
                                        )}

                                        {/* Label with inline required marker - only show if label exists */}
                                        {/* Label with inline required marker - only show if label exists */}
                                        {/* For particular types like consent: if no choices provided, the label is used inside the component, so don't show it here to avoid duplication */}
                                        {question.label && (question.type !== 'consent' || (question.choices && question.choices.length > 0)) && (
                                            <label className="pir-form-label font-bai block whitespace-pre-line">
                                                <span className="text-base md:text-lg">{question.label}</span>
                                                {question.required && (
                                                    <span className="text-sm text-destructive font-normal ml-2">(จำเป็น)</span>
                                                )}
                                            </label>
                                        )}

                                        {/* Description */}
                                        {question.description && (
                                            <p className="pir-form-description font-bai">
                                                {question.description}
                                            </p>
                                        )}

                                        {/* Input */}
                                        {renderQuestionInput(question)}

                                        {/* Validation Error */}
                                        {validationErrors[question.id] && (
                                            <p className="text-sm text-destructive font-bai mt-2 flex items-center gap-1.5">
                                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                {validationErrors[question.id]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Submit Button */}
                            <div className="pt-6 border-t border-border mt-8">
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full h-12 md:h-14 text-base md:text-lg font-bai rounded-full bg-primary hover:bg-primary/90 transition-all hover:shadow-lg"
                                >
                                    <Check className="h-5 w-5 mr-2" />
                                    ส่งคำตอบ
                                </Button>
                                <p className="text-center text-sm text-muted-foreground font-bai mt-3">
                                    กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนกดส่ง
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div >

            {/* Floating Logo - Bottom Left */}
            {/* Floating Logo - Bottom Left */}
            {
                formConfig.logoUrl && (
                    <div className="fixed bottom-4 left-4 z-50">
                        <div className="bg-card rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow duration-300">
                            <img
                                src={formConfig.logoUrl}
                                alt="Logo"
                                className="h-8 md:h-10 object-contain"
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
}
