import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';


export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.in_progress,
    description: 'Updated ticket status (open, in_progress, closed)',
  })
  @IsEnum(TicketStatus, {
    message: 'status must be one of: open, in_progress, closed',
  })
  @IsNotEmpty({ message: 'status is required' })
  status: TicketStatus;
}
