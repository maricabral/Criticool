import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from './auth-user';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
  return request.user;
});
