import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({
    example: 'customer@clientcorp.com',
    description: 'Customer contact email address',
  })
  @IsEmail({}, { message: 'customer_email must be a valid email address' })
  @IsNotEmpty({ message: 'customer_email is required' })
  customer_email: string;

  @ApiProperty({
    example: 'Cannot download VAT invoice for August',
    description: 'Brief summary of the issue or ticket title',
  })
  @IsString()
  @IsNotEmpty({ message: 'subject is required' })
  @MinLength(3, { message: 'subject must be at least 3 characters long' })
  @MaxLength(255, { message: 'subject cannot exceed 255 characters' })
  subject: string;

  @ApiProperty({
    example: 'When attempting to click the Download PDF button in billing settings, a 500 error appears.',
    description: 'Detailed description of the customer inquiry or problem',
  })
  @IsString()
  @IsNotEmpty({ message: 'message is required' })
  @MinLength(5, { message: 'message must be at least 5 characters long' })
  message: string;
}
