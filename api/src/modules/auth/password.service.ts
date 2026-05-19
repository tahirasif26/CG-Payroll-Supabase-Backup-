import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TypedConfigService } from '@config/typed-config.service';

@Injectable()
export class PasswordService {
  constructor(private readonly config: TypedConfigService) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.get('BCRYPT_ROUNDS'));
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
