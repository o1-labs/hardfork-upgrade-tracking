import { NodeStats } from './types/node-stats';

export interface EnrichedNodeStats extends NodeStats {
  total_stake: number | null;
  num_delegators: number | null;
  percent_total_stake: number | null;
  percent_total_active_stake: number | null;
  is_active: boolean | null;
}

export interface StakeStats {
  upgradedActiveStakePercent: number;
  totalActiveStakePercent: number;
  upgradedTotalStakePercent: number;
  lastSync: string | null;
}

function truncateMiddle(str: string, startChars: number = 8, endChars: number = 6): string {
  if (!str || str.length <= startChars + endChars + 3) return str;
  return `${str.slice(0, startChars)}...${str.slice(-endChars)}`;
}

function formatStake(stake: number | null): string {
  if (stake === null) return '-';
  if (stake >= 1e9) return (stake / 1e9).toFixed(2) + 'B';
  if (stake >= 1e6) return (stake / 1e6).toFixed(2) + 'M';
  if (stake >= 1e3) return (stake / 1e3).toFixed(2) + 'K';
  return stake.toFixed(2);
}

function formatPercent(pct: number | null): string {
  if (pct === null) return '-';
  return (pct * 100).toFixed(2) + '%';
}

export function renderDashboard(stats: EnrichedNodeStats[], releasePercentage: number, stakeStats: StakeStats): string {
  const total = stats.length;
  const upgradedCount = stats.filter(s => s.upgraded).length;
  const pendingCount = total - upgradedCount;
  const percentage = total > 0 ? Math.round((upgradedCount / total) * 100) : 0;
  const stakePercentage = (stakeStats.upgradedActiveStakePercent * 100).toFixed(2);
  const totalStakePercentage = (stakeStats.upgradedTotalStakePercent * 100).toFixed(2);

  const rows = stats.map((s, i) => {
    const upgraded = s.upgraded;
    const bpKey = s.block_producer_public_key;
    return `
    <tr data-upgraded="${upgraded}"
        data-status="${upgraded ? '1' : '0'}"
        data-bp_key="${bpKey || ''}"
        data-total_stake="${s.total_stake ?? -1}"
        data-active_stake_pct="${s.percent_total_active_stake ?? -1}"
        data-total_stake_pct="${s.percent_total_stake ?? -1}"
        data-delegators="${s.num_delegators ?? -1}"
        data-is_active="${s.is_active === null ? -1 : (s.is_active ? 1 : 0)}"
        data-timestamp="${new Date(s.timestamp).getTime()}"
        data-commit="${s.commit_hash}"
        data-block_height="${s.max_observed_block_height}"
        data-peer_count="${s.peer_count}"
        data-peer_id="${s.peer_id}"
>
      <td><span class="badge ${upgraded ? 'badge-success' : 'badge-danger'}">${upgraded ? 'Upgraded' : 'Not Upgraded'}</span></td>
      <td class="mono">
        ${bpKey ? `
          <span class="copyable" data-full="${bpKey}" title="${bpKey}">
            ${truncateMiddle(bpKey, 8, 6)}
            <button class="copy-btn" onclick="copyToClipboard('${bpKey}', this)">
              <span class="material-icons-outlined">content_copy</span>
            </button>
          </span>
        ` : '-'}
      </td>
      <td class="mono">${formatStake(s.total_stake)}</td>
      <td class="mono">${formatPercent(s.percent_total_active_stake)}</td>
      <td class="mono">${formatPercent(s.percent_total_stake)}</td>
      <td class="mono">${s.num_delegators ?? '-'}</td>
      <td class="mono">${s.is_active === null ? '-' : (s.is_active ? 'Yes' : 'No')}</td>
      <td class="timestamp"><span class="date">${new Date(s.timestamp).toISOString().slice(0, 10)}</span><span class="time">${new Date(s.timestamp).toISOString().slice(11, 19)} UTC</span></td>
      <td class="mono">${s.commit_hash.substring(0, 8)}</td>
      <td class="mono">${s.max_observed_block_height.toLocaleString()}</td>
      <td class="mono">${s.peer_count}</td>
      <td class="key">
        <span class="copyable" data-full="${s.peer_id}" title="${s.peer_id}">
          ${truncateMiddle(s.peer_id, 8, 4)}
          <button class="copy-btn" onclick="copyToClipboard('${s.peer_id}', this)">
            <span class="material-icons-outlined">content_copy</span>
          </button>
        </span>
      </td>
    </tr>
  `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mina Hardfork Upgrade Tracking</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --mina-orange: #FF603B;
      --mina-blue: #5362C9;
      --mina-cyan: #AFF4F8;
      --primary: #5362C9;
      --primary-light: rgba(83, 98, 201, 0.15);
      --success: #AFF4F8;
      --success-light: rgba(175, 244, 248, 0.15);
      --danger: #FF603B;
      --danger-light: rgba(255, 96, 59, 0.1);
      --warning: #FBBF24;
      --warning-light: rgba(251, 191, 36, 0.15);
      --bg: #0f0f1a;
      --bg-card: #252540;
      --bg-card-hover: #252542;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --border: #2d2d4a;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    .header {
      background: linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(22, 33, 62, 0.8) 100%);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border);
      padding: 30px 0;
      margin-bottom: 40px;
    }

    .header-content {
      max-width: 1800px;
      margin: 0 auto;
      padding: 0 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .logo-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .logo h1 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(90deg, var(--mina-orange) 0%, var(--mina-blue) 50%, var(--mina-cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .logo span {
      font-size: 13px;
      background: linear-gradient(90deg, var(--mina-blue) 0%, var(--mina-cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 500;
    }

    .header-stats {
      display: flex;
      align-items: center;
      gap: 30px;
    }

    .header-stat {
      text-align: right;
    }

    .header-stat .label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .header-stat .value {
      font-size: 28px;
      font-weight: 700;
    }

    .header-stat .value.success { color: var(--success); }
    .header-stat .value.danger { color: var(--danger); }
    .header-stat .value.primary { color: var(--primary); }

    .container {
      max-width: 1800px;
      margin: 0 auto;
      padding: 0 30px 60px;
    }

    /* Main Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 20px;
    }

    .dashboard-grid .chart-card {
      grid-column: span 1;
    }

    .dashboard-grid .adoption-section {
      grid-column: span 4;
    }

    .dashboard-grid .stats-grid {
      grid-column: span 5;
      display: contents;
    }


    /* Donut Chart Card */
    .chart-card {
      background: rgba(35, 35, 60, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 20px;
      display: flex;
      flex-direction: column;
      height: fit-content;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
    }

    .chart-container {
      position: relative;
      height: 200px;
    }


    /* Network Adoption Section */
    .adoption-section {
      background: rgba(35, 35, 60, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      padding-bottom: 48px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .adoption-content {
      position: relative;
      z-index: 1;
    }

    .adoption-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .adoption-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .adoption-title .material-icons-outlined {
      font-size: 28px;
      color: var(--primary);
    }

    .adoption-title h2 {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
    }

    .adoption-percentage {
      font-size: 48px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--mina-blue) 0%, var(--mina-cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }

    .adoption-bar {
      height: 16px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      overflow: visible;
      position: relative;
    }

    .adoption-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--mina-blue) 0%, var(--mina-cyan) 100%);
      border-radius: 8px;
    }

    .release-marker {
      position: absolute;
      top: -8px;
      bottom: -8px;
      width: 4px;
      background: var(--warning);
      border-radius: 2px;
      transform: translateX(-50%);
      box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
    }

    .release-marker::before {
      content: 'Release Target';
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      font-weight: 600;
      color: var(--warning);
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .release-marker::after {
      content: attr(data-percentage);
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      font-size: 13px;
      font-weight: 700;
      color: var(--warning);
      white-space: nowrap;
    }

    .adoption-stats {
      display: flex;
      gap: 30px;
      margin-top: 32px;
    }

    .adoption-stat {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .adoption-stat .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .adoption-stat .dot.success { background: var(--success); }
    .adoption-stat .dot.danger { background: var(--danger); }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 20px;
    }

    .stats-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .last-sync {
      font-size: 13px;
      color: var(--text-muted);
      white-space: nowrap;
      background: rgba(35, 35, 60, 0.95);
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .last-sync::before {
      content: 'sync';
      font-family: 'Material Icons Outlined';
      font-size: 18px;
      color: var(--primary);
    }

    .export-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(35, 35, 60, 0.95);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text);
      font-size: 15px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .export-btn:hover {
      border-color: var(--primary);
      background: var(--primary-light);
    }

    .export-btn .material-icons-outlined {
      font-size: 18px;
      color: var(--primary);
    }

    .stat-card {
      background: rgba(35, 35, 60, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 24px;
    }

    .stat-card .icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .stat-card .icon .material-icons-outlined {
      font-size: 28px;
    }

    .stat-card.success .icon { background: var(--success-light); }
    .stat-card.success .icon .material-icons-outlined { color: var(--success); }
    .stat-card.danger .icon { background: var(--danger-light); }
    .stat-card.danger .icon .material-icons-outlined { color: var(--danger); }
    .stat-card.primary .icon { background: var(--primary-light); }
    .stat-card.primary .icon .material-icons-outlined { color: var(--primary); }
    .stat-card.muted .icon { background: rgba(148, 163, 184, 0.1); }
    .stat-card.muted .icon .material-icons-outlined { color: var(--text-muted); }

    .stat-card .label {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 8px;
      white-space: nowrap;
    }

    .stat-card .value {
      font-size: 26px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-card.success .value { color: var(--success); }
    .stat-card.danger .value { color: var(--danger); }
    .stat-card.primary .value { color: var(--primary); }
    .stat-card.muted .value { color: var(--text-muted); }

    .stat-card .subvalue {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .controls {
      grid-column: span 5;
      display: grid;
      grid-template-columns: subgrid;
      gap: 20px;
    }

    .controls .search-wrapper {
      grid-column: span 2;
    }

    .search-wrapper {
      position: relative;
    }

    .search-wrapper .material-icons-outlined {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 22px;
      z-index: 1;
      pointer-events: none;
    }

    input[type="text"] {
      width: 100%;
      height: 100%;
      padding: 14px 14px 14px 52px;
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 15px;
      color: var(--text);
      font-family: inherit;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(83, 98, 201, 0.25);
    }

    input[type="text"]::placeholder {
      color: var(--text-muted);
    }

    /* Custom Dropdown */
    .custom-select {
      position: relative;
      min-width: 180px;
    }

    .custom-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 16px;
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 15px;
      color: var(--text);
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
      height: 100%;
      box-sizing: border-box;
    }

    .custom-select-trigger:hover {
      border-color: var(--primary);
    }

    .custom-select.open .custom-select-trigger {
      border-color: var(--primary);
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    .custom-select-trigger .arrow {
      transition: transform 0.2s ease;
    }

    .custom-select.open .custom-select-trigger .arrow {
      transform: rotate(180deg);
    }

    .custom-select-options {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: rgba(26, 26, 46, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid var(--primary);
      border-top: none;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
      overflow: hidden;
      z-index: 100;
      display: none;
    }

    .custom-select.open .custom-select-options {
      display: block;
    }

    .custom-select-option {
      padding: 12px 16px;
      font-size: 15px;
      color: var(--text);
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .custom-select-option:hover {
      background: var(--primary-light);
    }

    .custom-select-option.selected {
      background: var(--primary-light);
      color: var(--mina-cyan);
    }

    .custom-select-option .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .custom-select-option[data-value="all"] .dot {
      background: var(--primary);
    }

    .custom-select-option[data-value="upgraded"] .dot {
      background: var(--success);
    }

    .custom-select-option[data-value="pending"] .dot {
      background: var(--danger);
    }

    select {
      display: none;
    }

    .table-wrapper {
      background: rgba(35, 35, 60, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow-x: auto;
      margin-top: 20px;
    }

    /* Custom Scrollbar */
    .table-wrapper::-webkit-scrollbar {
      height: 8px;
    }

    .table-wrapper::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    .table-wrapper::-webkit-scrollbar-thumb {
      background: var(--primary);
      border-radius: 4px;
    }

    .table-wrapper::-webkit-scrollbar-thumb:hover {
      background: var(--mina-cyan);
    }

    /* Firefox scrollbar */
    .table-wrapper {
      scrollbar-width: thin;
      scrollbar-color: var(--primary) rgba(255, 255, 255, 0.05);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      padding: 6px 6px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    }

    th:hover {
      color: var(--text);
      background: rgba(255,255,255,0.05);
    }

    th .sort-icon {
      display: inline-block;
      margin-left: 6px;
      opacity: 0.3;
      font-size: 14px;
      vertical-align: middle;
    }

    th.sorted .sort-icon {
      opacity: 1;
      color: var(--mina-cyan);
    }

    th.sorted {
      color: var(--mina-cyan);
    }

    td {
      padding: 6px 6px;
      border-bottom: 1px solid var(--border);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tbody tr {
      transition: background 0.2s ease;
    }

    tbody tr:hover {
      background: var(--bg-card-hover);
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    .key {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--text-muted);
    }

    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--text);
    }

    .timestamp {
      font-size: 13px;
      color: var(--text-muted);
    }

    .timestamp .date {
      display: block;
      white-space: nowrap;
    }

    .timestamp .time {
      display: block;
      white-space: nowrap;
      opacity: 0.7;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge-success {
      background: var(--success-light);
      color: var(--success);
    }

    .badge-danger {
      background: var(--danger-light);
      color: var(--danger);
    }

    .badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .copyable {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .copy-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      transition: all 0.2s ease;
    }

    .copy-btn:hover {
      opacity: 1;
      background: var(--primary-light);
    }

    .copy-btn .material-icons-outlined {
      font-size: 16px;
      color: var(--text-muted);
    }

    .copy-btn.copied .material-icons-outlined {
      color: var(--success);
    }

    tr.hidden { display: none; }

    @media (max-width: 1024px) {
      .top-row {
        grid-template-columns: 1fr;
      }
      .header-content {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }
      .header-stats {
        justify-content: center;
        flex-wrap: wrap;
      }
      .adoption-header {
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }
      .adoption-title {
        justify-content: center;
      }
    }

  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <div class="logo">
        <div class="logo-icon"><img src="/favicon.ico" alt="Mina"></div>
        <div>
          <h1>Mina Protocol</h1>
          <span>Hardfork Upgrade Tracker</span>
        </div>
      </div>
      <div class="header-stats">
        <div class="header-stat">
          <div class="label">Active Stake Upgraded</div>
          <div class="value success">${stakePercentage}%</div>
        </div>
        <div class="header-stat">
          <div class="label">Upgraded</div>
          <div class="value success">${upgradedCount}</div>
        </div>
        <div class="header-stat">
          <div class="label">Not Upgraded</div>
          <div class="value danger">${pendingCount}</div>
        </div>
        <div class="header-stat">
          <div class="label">Total</div>
          <div class="value primary">${total}</div>
        </div>
      </div>
    </div>
  </header>

  <div class="container">
    <div class="dashboard-grid">
      <!-- Donut Chart -->
      <div class="chart-card">
        <h2 class="card-title">Stake Distribution</h2>
        <div class="chart-container">
          <canvas id="upgradeChart"></canvas>
        </div>
      </div>

      <!-- Network Adoption -->
      <div class="adoption-section">
        <div class="adoption-content">
          <div class="adoption-header">
            <div class="adoption-title">
              <span class="material-icons-outlined">trending_up</span>
              <h2>Active Stake Adoption</h2>
            </div>
            <div class="adoption-percentage">${stakePercentage}%</div>
          </div>
          <div class="adoption-bar">
            <div class="adoption-bar-fill" style="width: ${stakePercentage}%"></div>
            <div class="release-marker" style="left: ${releasePercentage}%" data-percentage="${releasePercentage}%"></div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
        <div class="stat-card success">
          <div class="icon">
            <span class="material-icons-outlined">savings</span>
          </div>
          <div class="label">Upgraded Active Stake</div>
          <div class="value">${stakePercentage}%</div>
        </div>
        <div class="stat-card muted">
          <div class="icon">
            <span class="material-icons-outlined">account_balance</span>
          </div>
          <div class="label">Upgraded Total Stake</div>
          <div class="value">${totalStakePercentage}%</div>
        </div>
        <div class="stat-card success">
          <div class="icon">
            <span class="material-icons-outlined">check_circle</span>
          </div>
          <div class="label">Upgraded Nodes</div>
          <div class="value">${upgradedCount}</div>
        </div>
        <div class="stat-card danger">
          <div class="icon">
            <span class="material-icons-outlined">schedule</span>
          </div>
          <div class="label">Not Upgraded Nodes</div>
          <div class="value">${pendingCount}</div>
        </div>
        <div class="stat-card primary">
          <div class="icon">
            <span class="material-icons-outlined">dns</span>
          </div>
          <div class="label">Total Nodes</div>
          <div class="value">${total}</div>
        </div>

      <div class="controls">
      <div class="search-wrapper">
        <span class="material-icons-outlined">search</span>
        <input type="text" id="search" placeholder="Search by peer ID or public key...">
      </div>
      <div class="custom-select" id="filterWrapper">
        <div class="custom-select-trigger" id="filterTrigger">
          <span>All Nodes</span>
          <span class="material-icons-outlined arrow">expand_more</span>
        </div>
        <div class="custom-select-options">
          <div class="custom-select-option selected" data-value="all">
            <span class="dot"></span>
            <span>All Nodes</span>
          </div>
          <div class="custom-select-option" data-value="upgraded">
            <span class="dot"></span>
            <span>Upgraded Only</span>
          </div>
          <div class="custom-select-option" data-value="pending">
            <span class="dot"></span>
            <span>Not Upgraded Only</span>
          </div>
        </div>
      </div>
      <select id="filter" style="display:none">
        <option value="all">All Nodes</option>
        <option value="upgraded">Upgraded Only</option>
        <option value="pending">Not Upgraded Only</option>
      </select>
      ${stakeStats.lastSync ? `<div class="last-sync">Last stake sync: ${new Date(stakeStats.lastSync).toISOString().replace('T', ' ').slice(0, 19)} UTC</div>` : ''}
      <button class="export-btn" onclick="exportToCSV()">
        <span class="material-icons-outlined">download</span>
        Export CSV
      </button>
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th data-sort="status">Status<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="bp_key">Block Producer Key<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="total_stake">Total Stake<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="active_stake_pct">Active Stake %<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="total_stake_pct">Total Stake %<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="delegators">Delegators<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="is_active">Active<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="timestamp">Timestamp<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="commit">Commit<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="block_height">Block Height<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="peer_count">Peer Count<span class="sort-icon material-icons-outlined">unfold_more</span></th>
            <th data-sort="peer_id">Peer ID<span class="sort-icon material-icons-outlined">unfold_more</span></th>
          </tr>
        </thead>
        <tbody id="stats-table">
          ${rows}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const ctx = document.getElementById('upgradeChart').getContext('2d');
    const upgradedStake = ${stakeStats.upgradedActiveStakePercent * 100};
    const remainingStake = 100 - upgradedStake;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Upgraded', 'Not Upgraded'],
        datasets: [{
          data: [upgradedStake, remainingStake],
          backgroundColor: ['#AFF4F8', '#FF603B'],
          borderWidth: 0,
          borderRadius: 4,
          spacing: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 16,
              font: { family: 'Space Grotesk', size: 12 },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.raw.toFixed(2) + '%';
              }
            }
          }
        }
      }
    });

    const searchInput = document.getElementById('search');
    const filterSelect = document.getElementById('filter');
    const rows = document.querySelectorAll('#stats-table tr');

    function applyFilters() {
      const searchTerm = searchInput.value.toLowerCase();
      const filterValue = filterSelect.value;

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const isUpgraded = row.dataset.upgraded === 'true';

        const matchesSearch = text.includes(searchTerm);
        const matchesFilter = filterValue === 'all' ||
          (filterValue === 'upgraded' && isUpgraded) ||
          (filterValue === 'pending' && !isUpgraded);

        row.classList.toggle('hidden', !(matchesSearch && matchesFilter));
      });
    }

    searchInput.addEventListener('input', applyFilters);
    filterSelect.addEventListener('change', applyFilters);

    // Custom dropdown handling
    const customSelect = document.getElementById('filterWrapper');
    const customTrigger = document.getElementById('filterTrigger');
    const customOptions = customSelect.querySelectorAll('.custom-select-option');

    customTrigger.addEventListener('click', () => {
      customSelect.classList.toggle('open');
    });

    customOptions.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.dataset.value;
        const text = option.querySelector('span:last-child').textContent;

        // Update trigger text
        customTrigger.querySelector('span:first-child').textContent = text;

        // Update selected state
        customOptions.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');

        // Update hidden select and trigger filter
        filterSelect.value = value;
        customSelect.classList.remove('open');
        applyFilters();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!customSelect.contains(e.target)) {
        customSelect.classList.remove('open');
      }
    });

    // Table sorting
    const table = document.querySelector('table');
    const headers = table.querySelectorAll('th[data-sort]');
    const tbody = document.getElementById('stats-table');
    let currentSort = { column: null, direction: 'asc' };

    headers.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.dataset.sort;
        const isNumeric = ['total_stake', 'active_stake_pct', 'total_stake_pct', 'delegators', 'is_active', 'timestamp', 'block_height', 'peer_count', 'status'].includes(column);

        // Toggle direction if same column
        if (currentSort.column === column) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.column = column;
          currentSort.direction = 'desc'; // Default to desc for new column
        }

        // Update header styles
        headers.forEach(h => {
          h.classList.remove('sorted');
          h.querySelector('.sort-icon').textContent = 'unfold_more';
        });
        header.classList.add('sorted');
        header.querySelector('.sort-icon').textContent = currentSort.direction === 'asc' ? 'expand_less' : 'expand_more';

        // Sort rows
        const rowsArray = Array.from(tbody.querySelectorAll('tr'));
        rowsArray.sort((a, b) => {
          let aVal = a.dataset[column];
          let bVal = b.dataset[column];

          if (isNumeric) {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
          }

          if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
          return 0;
        });

        // Re-append rows in new order
        rowsArray.forEach(row => tbody.appendChild(row));
      });
    });

    function copyToClipboard(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        btn.querySelector('.material-icons-outlined').textContent = 'check';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.querySelector('.material-icons-outlined').textContent = 'content_copy';
        }, 2000);
      });
    }

    function exportToCSV() {
      const headers = ['Status', 'Block Producer Key', 'Total Stake', 'Active Stake %', 'Total Stake %', 'Delegators', 'Active', 'Timestamp', 'Commit', 'Block Height', 'Peer Count', 'Peer ID'];
      const rows = Array.from(document.querySelectorAll('#stats-table tr:not(.hidden)'));

      const formatVal = (val) => val === '-1' || val === -1 ? '' : val;

      const csvData = rows.map(row => {
        return [
          row.dataset.status === '1' ? 'Upgraded' : 'Not Upgraded',
          row.dataset.bp_key || '',
          formatVal(row.dataset.total_stake),
          formatVal(row.dataset.active_stake_pct),
          formatVal(row.dataset.total_stake_pct),
          formatVal(row.dataset.delegators),
          row.dataset.is_active === '1' ? 'Yes' : (row.dataset.is_active === '0' ? 'No' : ''),
          new Date(parseInt(row.dataset.timestamp)).toISOString(),
          row.dataset.commit,
          row.dataset.block_height,
          row.dataset.peer_count,
          row.dataset.peer_id
        ].map(val => '"' + String(val).replace(/"/g, '""') + '"').join(',');
      });

      const csv = [headers.join(','), ...csvData].join('\\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hardfork-upgrade-data-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}
