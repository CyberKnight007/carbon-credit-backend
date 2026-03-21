interface CertData {
    orgName: string;
    projectTitle: string;
    month: number;
    year: number;
    treesCount: number;
    co2Kg: number;
    credits: number;
}
export declare function generateCertificate(data: CertData): Promise<string>;
export {};
//# sourceMappingURL=certificate.service.d.ts.map