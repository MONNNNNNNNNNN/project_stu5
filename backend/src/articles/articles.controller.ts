import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller()
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  @Get('articles')
  findAll(@Query('category') category?: string) {
    return this.articlesService.findAll(category);
  }

  @Get('articles/:id')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Get('categories')
  categories() {
    return this.articlesService.categories();
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.articlesService.search(q);
  }
}
