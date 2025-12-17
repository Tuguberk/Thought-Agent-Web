"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Check } from "lucide-react";

const creditPackages = [
    {
        credits: 100,
        price: "$5",
        features: ["Basic support", "100 notes"],
        popular: false,
    },
    {
        credits: 500,
        price: "$20",
        features: ["Priority support", "500 notes", "Bulk import"],
        popular: true,
    },
    {
        credits: 1000,
        price: "$35",
        features: ["Premium support", "1000 notes", "Unlimited imports"],
        popular: false,
    },
];

export default function CreditsPage() {
    const [couponCode, setCouponCode] = React.useState("");
    const [redeemStatus, setRedeemStatus] = React.useState<{ success: boolean; message: string } | null>(null);
    const [isRedeeming, setIsRedeeming] = React.useState(false);

    const handleRedeem = async () => {
        if (!couponCode.trim()) return;
        setIsRedeeming(true);
        setRedeemStatus(null);
        try {
            const res = await fetch("/api/coupons/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: couponCode }),
            });
            const data = await res.json();
            if (res.ok) {
                setRedeemStatus({ success: true, message: `Success! Added ${data.creditsAdded} credits.` });
                setCouponCode("");
            } else {
                setRedeemStatus({ success: false, message: data.error || "Failed using coupon." });
            }
        } catch (error) {
            setRedeemStatus({ success: false, message: "Something went wrong." });
        } finally {
            setIsRedeeming(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center gap-4">
                <Link href="/brain" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-xl font-semibold">Buy Credits</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold">Top up your credits</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        You need credits to save notes and upload files. Choose a package that fits your needs.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                    {creditPackages.map((pkg, i) => (
                        <div
                            key={i}
                            className={`p-6 rounded-2xl border flex flex-col gap-4 relative overflow-hidden backdrop-blur-sm ${pkg.popular
                                ? "bg-primary/10 border-primary shadow-lg shadow-primary/20 scale-105 z-10"
                                : "bg-card/50 border-white/10 hover:border-white/20 transition-all"
                                }`}
                        >
                            {pkg.popular && (
                                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                    Best Value
                                </div>
                            )}
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-primary">{pkg.credits} Credits</div>
                                <div className="text-muted-foreground">One-time purchase</div>
                            </div>
                            <div className="text-4xl font-bold">{pkg.price}</div>

                            <ul className="flex-1 space-y-3 my-4">
                                {pkg.features.map((feature, j) => (
                                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Check size={16} className="text-primary" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${pkg.popular
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                                : "bg-white/10 hover:bg-white/20 text-foreground"
                                }`}>
                                <CreditCard size={18} />
                                Purchase
                            </button>
                        </div>
                    ))}
                </div>

                {/* Coupon Section */}
                <div className="w-full max-w-md mt-6 p-6 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-4 text-center">Have a coupon code?</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder="Enter code"
                            className="flex-1 bg-secondary/50 border border-transparent focus:border-primary/30 focus:bg-background rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all uppercase placeholder:normal-case"
                        />
                        <button
                            onClick={handleRedeem}
                            disabled={isRedeeming || !couponCode.trim()}
                            className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
                        >
                            {isRedeeming ? "..." : "Redeem"}
                        </button>
                    </div>
                    {redeemStatus && (
                        <div className={`mt-3 text-sm text-center font-medium ${redeemStatus.success ? "text-green-500" : "text-red-500"}`}>
                            {redeemStatus.message}
                        </div>
                    )}
                </div>

                <p className="text-xs text-muted-foreground mt-8">
                    This is a demo page. Payments are not actually processed.
                </p>
            </div>
        </div>
    );
}
