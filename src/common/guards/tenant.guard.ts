import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantRequest } from '../types/tenant-request.type';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = req.header('x-tenant-id');

    if (!tenantId) throw new UnauthorizedException('Missing x-tenant-id');

    req.tenantId = tenantId;
    return true;
  }
}
