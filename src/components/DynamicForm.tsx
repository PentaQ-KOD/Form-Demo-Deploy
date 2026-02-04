import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { MultiSelect, Option } from "@/components/ui/multi-select";

// Field configuration from API
interface FormField {
    id: string;
    label: string;
    type: "text" | "dropdown" | "multiselect" | "email" | "number" | "textarea";
    placeholder?: string;
    options?: string[] | Option[]; // Support both simple strings and objects
    required?: boolean;
}

interface DynamicFormProps {
    apiUrl?: string;
    onSubmit?: (data: Record<string, string | string[]>) => void;
    className?: string;
}

type FormState = "loading" | "error" | "success" | "empty";

export const DynamicForm = ({
    apiUrl = import.meta.env.VITE_FORM_FETCH_URL || "https://auto.pirsquare.net/webhook-test/pir/form",
    onSubmit,
    className = "",
}: DynamicFormProps) => {
    const [formState, setFormState] = useState<FormState>("loading");
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, string | string[]>>({});
    const [errorMessage, setErrorMessage] = useState<string>("");

    const fetchFormConfig = async () => {
        setFormState("loading");
        setErrorMessage("");

        try {
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`Failed to load form configuration (${response.status})`);
            }

            const rawData = await response.json();
            let formFields: FormField[] = [];

            // Parse response structure to find questions array
            if (Array.isArray(rawData)) {
                if (rawData.length > 0 && rawData[0] && "questions" in rawData[0] && Array.isArray(rawData[0].questions)) {
                    // Structure: [{ questions: [...] }]
                    formFields = rawData[0].questions;
                } else if (rawData.length > 0 && "id" in rawData[0]) {
                    // Structure: [field1, field2] (Legacy/Direct array)
                    formFields = rawData as FormField[];
                }
            } else if (typeof rawData === "object" && rawData !== null) {
                if ("questions" in rawData && Array.isArray(rawData.questions)) {
                    // Structure: { questions: [...] }
                    formFields = rawData.questions;
                }
            }

            if (formFields.length === 0) {
                setFormState("empty");
                return;
            }

            // Initialize form data with empty values
            const initialData: Record<string, string | string[]> = {};
            formFields.forEach((field) => {
                initialData[field.id] = field.type === "multiselect" ? [] : "";
            });

            setFields(formFields);
            setFormData(initialData);
            setFormState("success");
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Failed to load form");
            setFormState("error");
            console.error("Error fetching form configuration:", err);
        }
    };

    useEffect(() => {
        fetchFormConfig();
    }, [apiUrl]);

    const handleInputChange = (fieldId: string, value: string | string[]) => {
        setFormData((prev) => ({
            ...prev,
            [fieldId]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSubmit) {
            onSubmit(formData);
        }
    };

    // Helper to normalize options to Option[]
    const getOptions = (field: FormField): Option[] => {
        if (!field.options) return [];
        return field.options.map((opt) => {
            if (typeof opt === "string") {
                return { label: opt, value: opt };
            }
            return opt;
        });
    };

    // Loading state with skeleton animation
    if (formState === "loading") {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="flex items-center justify-center py-8">
                    <div className="space-y-4 w-full max-w-md">
                        {/* Skeleton loader */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2 animate-pulse">
                                <div className="h-5 w-32 bg-muted rounded" />
                                <div className="h-12 w-full bg-muted rounded-md" />
                            </div>
                        ))}
                        <div className="text-center text-muted-foreground font-bai mt-4">
                            Loading form configuration...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state with retry button
    if (formState === "error") {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="flex items-center space-x-2 text-destructive">
                        <AlertCircle className="h-6 w-6" />
                        <span className="text-lg font-medium font-bai">Failed to load form</span>
                    </div>
                    {errorMessage && (
                        <p className="text-sm text-muted-foreground font-noto text-center max-w-sm">
                            {errorMessage}
                        </p>
                    )}
                    <Button
                        onClick={fetchFormConfig}
                        variant="outline"
                        className="flex items-center space-x-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span className="font-bai">Retry</span>
                    </Button>
                </div>
            </div>
        );
    }

    // Empty state
    if (formState === "empty") {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <p className="text-muted-foreground font-bai">
                        No form fields configured
                    </p>
                    <Button
                        onClick={fetchFormConfig}
                        variant="outline"
                        className="flex items-center space-x-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span className="font-bai">Refresh</span>
                    </Button>
                </div>
            </div>
        );
    }

    // Success state - render dynamic form
    return (
        <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
            {fields.map((field) => (
                <div key={field.id}>
                    <label
                        htmlFor={field.id}
                        className="block text-lg md:text-2xl font-medium text-foreground mb-3 font-bai"
                    >
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </label>

                    {field.type === "multiselect" ? (
                        <MultiSelect
                            options={getOptions(field)}
                            selected={Array.isArray(formData[field.id]) ? (formData[field.id] as string[]) : []}
                            onChange={(value) => handleInputChange(field.id, value)}
                            placeholder={field.placeholder || "Select options..."}
                            className="font-bai text-lg md:text-2xl"
                        />
                    ) : field.type === "dropdown" && field.options ? (
                        <Select
                            value={formData[field.id] as string}
                            onValueChange={(value) => handleInputChange(field.id, value)}
                        >
                            <SelectTrigger
                                id={field.id}
                                className="w-full font-bai text-lg md:text-2xl h-12 md:h-16 px-4 md:px-6"
                            >
                                <SelectValue placeholder={field.placeholder || "Select an option..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {getOptions(field).map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className="font-bai text-base md:text-lg"
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : field.type === "textarea" ? (
                        <textarea
                            id={field.id}
                            value={formData[field.id] as string}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="flex min-h-24 w-full rounded-md border border-input bg-background px-4 md:px-6 py-3 text-lg md:text-2xl font-bai ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            rows={4}
                        />
                    ) : (
                        <Input
                            id={field.id}
                            type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
                            value={formData[field.id] as string}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="w-full font-bai text-lg md:text-2xl h-12 md:h-16 px-4 md:px-6"
                        />
                    )}
                </div>
            ))}

            {onSubmit && fields.length > 0 && (
                <Button
                    type="submit"
                    className="w-full text-base md:text-xl h-12 md:h-14 rounded-full mt-6"
                >
                    Submit
                </Button>
            )}
        </form>
    );
};

