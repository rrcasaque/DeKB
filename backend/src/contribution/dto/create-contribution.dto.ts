import { IsString, IsArray, ArrayMinSize, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateContributionDto {
  @IsString()
  @IsNotEmpty()
  documentHash: string;

  @IsString()
  @IsNotEmpty()
  walletPrivateKey: string;

  @IsString()
  @IsNotEmpty()
  vectorStoreId: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  documentTitle: string;

  @IsString()
  @IsOptional()
  ipfsHash: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  tags: string[];
}