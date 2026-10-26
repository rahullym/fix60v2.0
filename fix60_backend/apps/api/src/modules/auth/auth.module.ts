import { Module } from '@nestjs/common';
import { FirebaseAuthService } from '../../integrations/firebase/firebase-auth.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UsersRepository, FirebaseAuthService],
  exports: [UsersRepository],
})
export class AuthModule {}
