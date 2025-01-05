import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "src/infrastructure/database/prisma.service";

@Controller('test')
@ApiTags('test')
export class TestController {
    constructor(private prismaService: PrismaService) {}

    @Get('/prisma')
    async testDb() {
        try {
            await this.prismaService.$connect();
            return { status: 'Connected' };
        } catch (error) {
            return { status: 'Failed', error: error.message };
        }
    }
}
