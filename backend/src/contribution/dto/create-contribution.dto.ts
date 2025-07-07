import { IsString, IsArray, ArrayMinSize, IsNotEmpty } from 'class-validator';

export class CreateContributionDto {  
  @IsString()
  @IsNotEmpty()
  vectorStoreId: string;

  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @IsString()
  @IsNotEmpty()
  contributionURL: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  tags: string[];
}