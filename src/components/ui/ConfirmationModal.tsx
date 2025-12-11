"use client";

import { X, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmJson?: string; // Optional: specific styling for confirm button
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
}: ConfirmationModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md transform rounded-2xl bg-card border border-white/10 p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute right-4 top-4">
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-destructive">
                        <div className="p-2 rounded-full bg-destructive/10">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">
                            {title}
                        </h3>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                    </p>

                    <div className="flex items-center justify-end gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all hover:scale-105 active:scale-95"
                        >
                            Delete Note
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
