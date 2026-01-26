import { NodeStats } from '../types/node-stats';
import { statsService } from './stats-service';
import { renderDashboard } from '../templates';

export const dashboardService = {
  async render(releasePercentage: number): Promise<string> {
    const stats = await statsService.getAll();
    return renderDashboard(stats, releasePercentage);
  },
};
