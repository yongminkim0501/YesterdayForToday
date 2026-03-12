import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const end = this.metricsService.httpRequestDuration.startTimer();

    res.on('finish', () => {
      const route = req.route?.path || req.path;
      end({
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
      });
    });

    next();
  }
}
