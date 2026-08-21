import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('A variável de ambiente REDIS_URL não foi definida.');
    }

    this.client = createClient({
      url: redisUrl,
    });

    this.client.on('error', (error) => {
      this.logger.error('Erro na conexão com o Redis.', error);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Redis conectado.');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, {
      EX: ttlSeconds,
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async invalidateUserSessions(userId: string): Promise<number> {
    let invalidated = 0;

    for await (const keys of this.client.scanIterator({
      MATCH: 'auth:session:*',
      COUNT: 100,
    })) {
      for (const key of keys) {
        const rawSession = await this.client.get(key);
        if (!rawSession) continue;

        try {
          const session = JSON.parse(rawSession) as { userId?: string };
          if (session.userId === userId) {
            invalidated += await this.client.del(key);
          }
        } catch {
          // A malformed key cannot belong to a validated session. Leave it to
          // Redis TTL instead of deleting data with an unknown format.
        }
      }
    }

    return invalidated;
  }
}
