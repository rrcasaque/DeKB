import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ContributionService } from './contribution.service';
import { CreateContributionDto } from './dto/create-contribution.dto';

@Controller('contribution')
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  @Post()
  create(@Body() createContributionDto: CreateContributionDto) {
    return this.contributionService.addContribution(createContributionDto);
  }

  @Get("")
  getAllContributions() {
    return this.contributionService.getAllContributions();
  }

  @Get("/getTotalContributions")
  getTotalContributions() {
    return this.contributionService.getTotalContributions();
  }

  @Get("/getContributionDetails/:id")
  getContributionDetails(@Param('id') id: string) {
    return this.contributionService.getContributionDetails(+id);
  }

  @Get("/getContributionsByContributor/:contributorAddress")
  getContributionsByContributor(@Param('contributorAddress') contributorAddress: string) {
    return this.contributionService.getContributionsByContributor(contributorAddress);
  }
}
