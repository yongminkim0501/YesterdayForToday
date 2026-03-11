import { Controller, Post, Body, Query, Get } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';

@Controller('api/subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post()
  async subscribe(@Body() dto: SubscribeDto) {
    const subscriber = await this.subscribersService.subscribe(dto.email);
    return {
      message: '인증 이메일을 발송했습니다. 이메일을 확인해 주세요!',
      email: subscriber.email,
    };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.subscribersService.verifyEmail(token);
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    await this.subscribersService.unsubscribe(dto.token);
    return { message: '구독이 해지되었습니다.' };
  }

  @Get('verify-token')
  async verifyToken(@Query('token') token: string) {
    return this.subscribersService.verifyToken(token);
  }
}
