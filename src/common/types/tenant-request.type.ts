import { Request } from 'express';

export type TenantRequest = Request & { tenantId: string };
