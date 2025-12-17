"use client";

import { X, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    actionLabel?: string;
    actionLink?: string;
}

export function AlertModal({
    isOpen,
    onClose,
    title,
    description,
    actionLabel = "OK",
    actionLink
}: AlertModalProps) {
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
                    <div className="flex items-center gap-3 text-primary">
                        <div className="p-2 rounded-full bg-primary/10">
                            <AlertCircle size={24} />
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
                            Close
                        </button>
                        {actionLink ? (
                            <Link
                                href={actionLink}
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                            >
                                {actionLabel}
                            </Link>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                            >
                                {actionLabel}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
