import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Real server-triggered push, on top of the app's local reminders. Used only
 * for things the client can't compute on its own — e.g. an admin suspending
 * a city's restriction on short notice. See CitiesService for the trigger.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private app: App | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT not set — push notifications are disabled');
      return;
    }
    try {
      this.app = initializeApp({ credential: cert(JSON.parse(raw)) }, 'push-service');
      this.logger.log('Firebase Admin initialized — push notifications are enabled');
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase Admin: ${(error as Error).message}`);
    }
  }

  async registerToken(userId: string, token: string, platform = 'android'): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }

  /** Sends a push to every device belonging to a user with a vehicle in the given city. */
  async notifyCityUsers(cityId: string, title: string, body: string): Promise<void> {
    if (!this.app) return;

    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { user: { vehicles: { some: { cityId } } } },
      select: { token: true },
    });
    if (deviceTokens.length === 0) return;

    const response = await getMessaging(this.app).sendEachForMulticast({
      tokens: deviceTokens.map((d) => d.token),
      notification: { title, body },
    });

    const invalidTokens = response.responses
      .map((result, index) => (result.success ? null : deviceTokens[index].token))
      .filter((token): token is string => token !== null);

    if (invalidTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }

    this.logger.log(`Push sent: ${response.successCount}/${deviceTokens.length} devices (city ${cityId})`);
  }
}
