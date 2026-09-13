import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({ enum: ['thumbs_up', 'thumbs_down'], example: 'thumbs_up', description: 'Agent evaluation of AI suggestion' })
  @IsString()
  @IsIn(['thumbs_up', 'thumbs_down'])
  rating: 'thumbs_up' | 'thumbs_down';

  @ApiPropertyOptional({ example: 'Edited response for customer...', description: 'Optional human-edited reply' })
  @IsOptional()
  @IsString()
  edited_reply?: string;

  @ApiPropertyOptional({ example: 'SOP citation was accurate.', description: 'Agent feedback notes for RLHF' })
  @IsOptional()
  @IsString()
  agent_notes?: string;

  @ApiPropertyOptional({ example: 'SOP citation was accurate.', description: 'Agent feedback notes (alias for agent_notes)' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Edited response for customer...', description: 'Optional human correction (alias for edited_reply)' })
  @IsOptional()
  @IsString()
  human_correction?: string;
}
