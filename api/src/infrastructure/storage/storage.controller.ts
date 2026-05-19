import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Response } from 'express';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { StorageService } from './storage.service';

@ApiTags('storage')
@ApiBearerAuth('access-token')
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @UseGuards(ClientScopeGuard, RolesGuard)
  @ClientScope()
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @Get('signed-url/:bucket/*')
  @ApiOperation({
    summary: 'Generate a short-lived signed download URL (S3) or direct URL (local)',
  })
  async signedUrl(
    @Param('bucket') bucket: string,
    @Param('0') key: string,
    @ActiveClientId() _clientId: string,
    @Query('expires') expires?: string,
  ) {
    const url = await this.storage.getSignedDownloadUrl(bucket, key, {
      expiresInSeconds: expires ? Number(expires) : 300,
    });
    return { url };
  }

  /**
   * Local driver only — streams files from disk. In production with S3 the FE
   * should hit the signed URL directly; this proxy is dev-mode convenience.
   */
  @Get('files/:bucket/*')
  files(
    @Param('bucket') bucket: string,
    @Param('0') key: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    const full = path.join(process.env.STORAGE_LOCAL_ROOT ?? path.resolve(process.cwd(), 'storage-data'), bucket, key);
    res.set({ 'Content-Disposition': `inline; filename="${path.basename(key)}"` });
    return new StreamableFile(fs.createReadStream(full));
  }
}
