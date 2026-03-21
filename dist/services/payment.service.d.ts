export declare function createPaymentIntent(organizationId: string, projectId: string, amountUsd: number): Promise<any>;
export declare function confirmProjectFunding(paymentIntentId: string, organizationId?: string, projectId?: string, amount?: number): Promise<void>;
export declare function processMonthlyPayouts(month: number, year: number): Promise<void>;
//# sourceMappingURL=payment.service.d.ts.map