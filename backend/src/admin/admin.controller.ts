import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { LoginDto } from './dto/login.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';
import { SubscribeDto } from '../subscribers/dto/subscribe.dto';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async login(@Body() dto: LoginDto) {
    return this.adminService.login(dto.username, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // Posts CRUD
  @UseGuards(JwtAuthGuard)
  @Post('posts')
  async createPost(@Body() dto: CreatePostDto) {
    return this.adminService.createPost(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('posts')
  async findAllPosts() {
    return this.adminService.findAllPosts();
  }

  @UseGuards(JwtAuthGuard)
  @Get('posts/:id')
  async findOnePost(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findOnePost(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('posts/:id')
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.adminService.updatePost(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id')
  async removePost(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.removePost(id);
    return { message: '삭제되었습니다.' };
  }

  // Newsletters CRUD
  @UseGuards(JwtAuthGuard)
  @Post('newsletters')
  async createNewsletter(@Body() dto: CreateNewsletterDto) {
    return this.adminService.createNewsletter(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('newsletters')
  async findAllNewsletters() {
    return this.adminService.findAllNewsletters();
  }

  @UseGuards(JwtAuthGuard)
  @Get('newsletters/:id')
  async findOneNewsletter(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findOneNewsletter(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('newsletters/:id')
  async updateNewsletter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsletterDto,
  ) {
    return this.adminService.updateNewsletter(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('newsletters/:id')
  async removeNewsletter(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.removeNewsletter(id);
    return { message: '삭제되었습니다.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('newsletters/:id/send')
  async sendNewsletter(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.sendNewsletter(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('newsletters/:id/test-send')
  async testSendNewsletter(
    @Param('id', ParseIntPipe) id: number,
    @Body('email') email?: string,
  ) {
    await this.adminService.testSendNewsletter(id, email);
    return { message: '테스트 이메일이 발송되었습니다.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('newsletters/:id/preview')
  async previewNewsletter(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const html = await this.adminService.previewNewsletter(id);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  // Subscribers management
  @UseGuards(JwtAuthGuard)
  @Get('subscribers')
  async getSubscribers() {
    return this.adminService.getSubscribers();
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribers')
  async addSubscriber(@Body() dto: SubscribeDto) {
    return this.adminService.addSubscriber(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subscribers/:id')
  async deleteSubscriber(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteSubscriber(id);
    return { message: '삭제되었습니다.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscribers/export')
  async exportSubscribers(@Res() res: Response) {
    const csv = await this.adminService.exportSubscribersCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
    res.send(csv);
  }
}
