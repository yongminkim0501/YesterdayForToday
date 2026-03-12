import { Controller, Get, Req, Res, ForbiddenException, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') token?: string,
  ) {
    const metricsToken = process.env.METRICS_TOKEN;
    if (metricsToken) {
      // Token-based auth: require matching token
      if (token !== metricsToken) {
        throw new ForbiddenException('Invalid or missing metrics token.');
      }
    } else {
      // No token configured: restrict to localhost only
      const ip = req.ip || req.socket.remoteAddress || '';
      const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
      if (!isLocalhost) {
        throw new ForbiddenException('Metrics endpoint is only accessible from localhost.');
      }
    }

    res.setHeader('Content-Type', this.metricsService.getContentType());
    res.send(await this.metricsService.getMetrics());
  }
}
