import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTicketDto {
  @ApiProperty({
    example: 'Sarah Jenkins',
    description: 'Name or email of the assigned support specialist/engineer',
  })
  @IsString()
  @IsNotEmpty({ message: 'assigned_to is required' })
  assigned_to: string;
}
