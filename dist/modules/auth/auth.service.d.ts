export declare function generateTokens(userId: string, role: string, email: string): {
    accessToken: string;
    refreshToken: string;
};
export declare function registerUser(data: {
    email: string;
    password: string;
    role: string;
    organizationData?: any;
    farmerData?: any;
}): Promise<{
    user: {
        organization: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyName: string;
            registrationNumber: string | null;
            country: string;
            website: string | null;
            logoUrl: string | null;
            description: string | null;
            stripeCustomerId: string | null;
            escrowBalance: number;
            totalCreditsEarned: number;
            isKycVerified: boolean;
            userId: string;
        } | null;
        farmer: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            country: string;
            isKycVerified: boolean;
            fullName: string;
            idDocument: string | null;
            idDocumentUrl: string | null;
            bankAccountName: string | null;
            bankAccountNumber: string | null;
            bankRoutingNumber: string | null;
            stripeAccountId: string | null;
            totalEarnings: number;
            pendingEarnings: number;
            userId: string;
        } | null;
    } & {
        id: string;
        role: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        isVerified: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}>;
export declare function loginUser(email: string, password: string): Promise<{
    user: {
        organization: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyName: string;
            registrationNumber: string | null;
            country: string;
            website: string | null;
            logoUrl: string | null;
            description: string | null;
            stripeCustomerId: string | null;
            escrowBalance: number;
            totalCreditsEarned: number;
            isKycVerified: boolean;
            userId: string;
        } | null;
        farmer: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            country: string;
            isKycVerified: boolean;
            fullName: string;
            idDocument: string | null;
            idDocumentUrl: string | null;
            bankAccountName: string | null;
            bankAccountNumber: string | null;
            bankRoutingNumber: string | null;
            stripeAccountId: string | null;
            totalEarnings: number;
            pendingEarnings: number;
            userId: string;
        } | null;
    } & {
        id: string;
        role: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        isVerified: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}>;
export declare function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
}>;
export declare function verifyEmail(userId: string, code: string): Promise<void>;
//# sourceMappingURL=auth.service.d.ts.map