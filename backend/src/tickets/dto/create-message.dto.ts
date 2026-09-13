import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    example: 'Please check your inbox, we have re-issued the invoice.',
    description: 'Message body or internal whisper content',
  })
  @IsString()
  @IsNotEmpty({ message: 'content is required' })
  @MinLength(1, { message: 'content must not be empty' })
  content: string;

  @ApiProperty({
    example: 'agent',
    enum: ['customer', 'agent', 'internal_note'],
    description: 'Role of the message sender or note visibility',
  })
  @IsString()
  @IsNotEmpty({ message: 'sender_type is required' })
  @IsIn(['customer', 'agent', 'internal_note'], {
    message: 'sender_type must be customer, agent, or internal_note',
  })
  sender_type: 'customer' | 'agent' | 'internal_note';

  @ApiPropertyOptional({
    example: 'Sarah Jenkins',
    description: 'Display name of the sender or internal staff author',
  })
  @IsOptional()
  @IsString()
  sender_name?: string;

  @ApiPropertyOptional({
    example: 'sarah.jenkins@goodevadesk.com',
    description: 'Email address of the sender',
  })
  @IsOptional()
  @IsString()
  sender_email?: string;
}
