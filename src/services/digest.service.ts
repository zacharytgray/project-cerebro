/**
 * Digest service - aggregates reports from multiple brains
 */

import { logger } from '../lib/logger';
import { ReportService, Report } from './report.service';

export interface DigestSummary {
  date: string;
  brainReports: {
    brainId: string;
    reports: Report[];
  }[];
  totalReports: number;
  generatedAt: number;
}

export class DigestService {
  constructor(private reportService: ReportService) {}

  /**
   * Generate a digest summary for a specific date
   */
  async generateDigest(brainIds: string[], date?: string): Promise<DigestSummary> {
    const reportDate = date || new Date().toISOString().split('T')[0];
    
    logger.info('Generating digest', { date: reportDate, brainCount: brainIds.length });

    const brainReports: DigestSummary['brainReports'] = [];
    let totalReports = 0;

    for (const brainId of brainIds) {
      const reports = await this.reportService.readReportsForDate(brainId, reportDate);
      if (reports.length > 0) {
        brainReports.push({ brainId, reports });
        totalReports += reports.length;
      }
    }

    const digest: DigestSummary = {
      date: reportDate,
      brainReports,
      totalReports,
      generatedAt: Date.now(),
    };

    logger.info('Digest generated', {
      date: reportDate,
      totalReports,
      brainsWithReports: brainReports.length,
    });

    return digest;
  }

  /**
   * Format digest as markdown
   */
  formatDigest(digest: DigestSummary): string {
    const lines: string[] = [];
    lines.push(`# Daily Digest - ${digest.date}`);
    lines.push('');
    lines.push(`Generated at: ${new Date(digest.generatedAt).toLocaleString()}`);
    lines.push(`Total reports: ${digest.totalReports}`);
    lines.push('');

    for (const { brainId, reports } of digest.brainReports) {
      lines.push(`## ${brainId}`);
      lines.push('');

      for (const report of reports) {
        lines.push(`### ${report.kind.toUpperCase()}`);
        lines.push('');
        lines.push(report.content);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}
