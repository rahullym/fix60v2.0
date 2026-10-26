import { Controller, Get, Inject, Injectable, Module } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  DEFAULT_THEME_SLUG,
  organization,
  systemThemePresets,
  themes,
  type Database,
} from '@fix60/db';
import { themeTokensSchema, type PublicBranding } from '@fix60/shared';
import { Public } from '../../common/access/access.decorators';
import { DATABASE } from '../../database/database.module';

const FALLBACK_NAME = 'Fix60';

@Injectable()
export class BrandingService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Name, logo and active palette. Unknown or invalid themes fall back to the default preset. */
  async getPublic(): Promise<PublicBranding> {
    const [org] = await this.db
      .select()
      .from(organization)
      .where(isNull(organization.deletedAt))
      .limit(1);
    const slug = org?.activeThemeSlug ?? DEFAULT_THEME_SLUG;
    const systemPreset = systemThemePresets.find((preset) => preset.slug === slug);
    const customTokens = systemPreset
      ? null
      : (
          await this.db
            .select({ tokens: themes.tokens })
            .from(themes)
            .where(and(eq(themes.slug, slug), isNull(themes.deletedAt)))
        )[0]?.tokens;
    const parsed = themeTokensSchema.safeParse(systemPreset?.tokens ?? customTokens);
    const fallback = systemThemePresets.find((preset) => preset.slug === DEFAULT_THEME_SLUG)!;
    return {
      name: org?.name ?? FALLBACK_NAME,
      logoUrl: org?.logoUrl ?? null,
      theme: parsed.success ? parsed.data : themeTokensSchema.parse(fallback.tokens),
    };
  }
}

@Controller('branding')
@Public()
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Get()
  get(): Promise<PublicBranding> {
    return this.branding.getPublic();
  }
}

@Module({ controllers: [BrandingController], providers: [BrandingService] })
export class BrandingModule {}
