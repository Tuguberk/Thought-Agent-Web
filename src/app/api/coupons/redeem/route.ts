import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { code } = await req.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "Invalid code" }, { status: 400 });
        }

        const normalizedCode = code.trim().toUpperCase();

        // Start transaction to ensures consistency
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch coupon with current state
            const coupon = await tx.coupon.findUnique({
                where: { code: normalizedCode },
            });

            if (!coupon) {
                throw new Error("Invalid coupon code");
            }

            if (coupon.usedCount >= coupon.maxUses) {
                throw new Error("This coupon has been fully claimed");
            }

            // 2. Check if user already used it
            const existingRedemption = await tx.couponRedemption.findUnique({
                where: {
                    userId_couponId: {
                        userId: session.user!.id!,
                        couponId: coupon.id,
                    },
                },
            });

            if (existingRedemption) {
                throw new Error("You have already redeemed this coupon");
            }

            // 3. Update records
            // Increment usage
            await tx.coupon.update({
                where: { id: coupon.id },
                data: { usedCount: { increment: 1 } },
            });

            // Create redemption record
            await tx.couponRedemption.create({
                data: {
                    userId: session.user!.id!,
                    couponId: coupon.id,
                },
            });

            // Grant credits
            const updatedUser = await tx.user.update({
                where: { id: session.user!.id! },
                data: { credits: { increment: coupon.credits } },
            });

            return {
                success: true,
                creditsAdded: coupon.credits,
                newBalance: updatedUser.credits,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Redemption error:", error);
        const message = error instanceof Error ? error.message : "Failed to redeem code";
        // Return 400 for known errors (validation), 500 for unexpected
        const status = message === "Invalid coupon code" || message === "This coupon has been fully claimed" || message === "You have already redeemed this coupon" ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
