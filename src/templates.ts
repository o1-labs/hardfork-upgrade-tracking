import { NodeStats } from './types/node-stats';

export function renderDashboard(stats: NodeStats[], releasePercentage: number): string {
  const total = stats.length;
  const upgradedCount = stats.filter(s => s.upgraded).length;
  const pendingCount = total - upgradedCount;
  const percentage = total > 0 ? Math.round((upgradedCount / total) * 100) : 0;

  const rows = stats.map((s, i) => {
    const upgraded = s.upgraded;
    return `
    <tr data-upgraded="${upgraded}" style="animation-delay: ${i * 0.03}s">
      <td class="key">${s.peer_id}</td>
      <td class="mono">${s.commit_hash.substring(0, 8)}</td>
      <td class="mono">${s.max_observed_block_height.toLocaleString()}</td>
      <td class="mono">${s.peer_count}</td>
      <td class="mono">${s.block_producer_public_key || '-'}</td>
      <td class="timestamp">${new Date(s.timestamp).toLocaleString()}</td>
      <td><span class="badge ${upgraded ? 'badge-success' : 'badge-danger'}">${upgraded ? 'Upgraded' : 'Pending'}</span></td>
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
      --bg-card: #1a1a2e;
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
      max-width: 1400px;
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
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 30px 60px;
    }

    /* Main Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }

    /* Donut Chart Card */
    .chart-card {
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 24px;
      display: flex;
      flex-direction: column;
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
      flex: 1;
      position: relative;
      min-height: 300px;
    }

    /* Right Column */
    .right-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Network Adoption Section */
    .adoption-section {
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
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
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .stats-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .stat-card {
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 24px;
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
      box-shadow: 0 20px 40px rgba(83, 98, 201, 0.15);
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

    .stat-card .label {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .stat-card .value {
      font-size: 26px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-card.success .value { color: var(--success); }
    .stat-card.danger .value { color: var(--danger); }
    .stat-card.primary .value { color: var(--primary); }

    .stat-card .subvalue {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .controls {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-wrapper {
      position: relative;
      flex: 1;
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
      padding: 14px 14px 14px 52px;
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 15px;
      color: var(--text);
      font-family: inherit;
      transition: all 0.2s ease;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(83, 98, 201, 0.25);
    }

    input[type="text"]::placeholder {
      color: var(--text-muted);
    }

    select {
      padding: 14px 40px 14px 16px;
      background-color: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 15px;
      color: var(--text);
      font-family: inherit;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 18px;
      transition: all 0.2s ease;
    }

    select:focus {
      outline: none;
      border-color: var(--primary);
    }

    .table-wrapper {
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      padding: 16px 24px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tbody tr {
      transition: background 0.2s ease;
      animation: fadeIn 0.4s ease forwards;
      opacity: 0;
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

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
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
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    tr.hidden { display: none; }

    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      .header-content {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }
      .header-stats {
        justify-content: center;
      }
      .stats-grid {
        grid-template-columns: 1fr;
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
          <div class="label">Upgraded</div>
          <div class="value success">${upgradedCount}</div>
        </div>
        <div class="header-stat">
          <div class="label">Pending</div>
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
        <h2 class="card-title">Distribution</h2>
        <div class="chart-container">
          <canvas id="upgradeChart"></canvas>
        </div>
      </div>

      <!-- Right Column: Adoption + Stats -->
      <div class="right-column">
        <!-- Network Adoption -->
        <div class="adoption-section">
          <div class="adoption-content">
            <div class="adoption-header">
              <div class="adoption-title">
                <span class="material-icons-outlined">trending_up</span>
                <h2>Network Adoption</h2>
              </div>
              <div class="adoption-percentage">${percentage}%</div>
            </div>
            <div class="adoption-bar">
              <div class="adoption-bar-fill" style="width: ${percentage}%"></div>
              <div class="release-marker" style="left: ${releasePercentage}%" data-percentage="${releasePercentage}%"></div>
            </div>
            <div class="adoption-stats">
              <div class="adoption-stat">
                <span class="dot success"></span>
                <span>${upgradedCount} upgraded</span>
              </div>
              <div class="adoption-stat">
                <span class="dot danger"></span>
                <span>${pendingCount} pending</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
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
            <div class="label">Pending Nodes</div>
            <div class="value">${pendingCount}</div>
          </div>
          <div class="stat-card primary">
            <div class="icon">
              <span class="material-icons-outlined">dns</span>
            </div>
            <div class="label">Total Nodes</div>
            <div class="value">${total}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="controls">
      <div class="search-wrapper">
        <span class="material-icons-outlined">search</span>
        <input type="text" id="search" placeholder="Search by peer ID or public key...">
      </div>
      <select id="filter">
        <option value="all">All Nodes</option>
        <option value="upgraded">Upgraded Only</option>
        <option value="pending">Pending Only</option>
      </select>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Peer ID</th>
            <th>Commit</th>
            <th>Block Height</th>
            <th>Peers</th>
            <th>Block Producer Key</th>
            <th>Timestamp</th>
            <th>Status</th>
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
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Upgraded', 'Pending'],
        datasets: [{
          data: [${upgradedCount}, ${pendingCount}],
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
              padding: 20,
              font: { family: 'Space Grotesk', size: 13 },
              usePointStyle: true,
              pointStyle: 'circle'
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
  </script>
</body>
</html>`;
}
