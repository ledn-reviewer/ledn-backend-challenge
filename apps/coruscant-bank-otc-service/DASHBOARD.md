# Actor Simulation Dashboard

## Overview

The Actor Simulation Dashboard provides a real-time web-based interface to monitor and control the client actor simulation in the Coruscant Bank OTC Service.

## Features

### 🎛️ **Simulation Controls**

- **Start/Stop Simulation**: Interactive buttons to control the simulation state
- **Real-time Status**: Visual indicators showing whether the simulation is running or stopped
- **Refresh Data**: Manual refresh capability for immediate updates

### 📊 **Performance Metrics**

- **Active Actors**: Current number of active client actors
- **Total Loans**: Cumulative loan applications processed
- **Collateral Top-ups**: Total collateral top-up transactions
- **Dead Actors**: Count of actors that have completed their lifecycle

### 👥 **Actor Overview**

- **Individual Actor Cards**: Detailed view of each active actor including:
  - Actor ID (truncated for display)
  - Actor type (shrimp, crab, octopus, fish, dolphin, shark, whale, humpback)
  - Risk tolerance percentage
  - Actions performed (out of 10 maximum)
  - Active loans count
  - Maximum loan amount in BSK

### 📝 **Activity Log**

- Real-time activity logging with timestamps
- Color-coded log levels (info, success, warning, error)
- Automatic scrolling and message limit management

### 🔄 **Real-time Updates**

- **WebSocket Integration**: Live updates without page refresh
- **Automatic Reconnection**: Handles connection drops gracefully
- **Fallback Polling**: Falls back to HTTP polling if WebSocket fails

## Access

Once the service is running, access the dashboard at:

<http://localhost:3000/dashboard>

## Actor Types & Characteristics

The dashboard visualizes different actor types with distinct styling:

| Actor Type | Range (BSK) | Color |
|------------|-------------|--------|
| 🦐 Shrimp | 1 | Purple |
| 🦀 Crab | 1-10 | Cyan |
| 🐙 Octopus | 10-50 | Green |
| 🐟 Fish | 50-100 | Orange |
| 🐬 Dolphin | 100-500 | Blue |
| 🦈 Shark | 500-1000 | Red |
| 🐳 Whale | 1000-5000 | Purple |
| 🐋 Humpback | 5000-10000 | Pink |

## Technical Implementation

### Architecture

- **Frontend**: Pure HTML/CSS/JavaScript (no external dependencies)
- **Backend**: Express.js with WebSocket support
- **Real-time Communication**: WebSocket with fallback to HTTP polling
- **Styling**: Modern CSS with glassmorphism effects and responsive design

### API Endpoints

- `GET /dashboard` - Serves the dashboard HTML interface
- `GET /simulation/dashboard-stats` - Extended statistics for dashboard
- `WS /dashboard/ws` - WebSocket endpoint for real-time updates
- `POST /simulation/start` - Start the simulation
- `POST /simulation/stop` - Stop the simulation

### WebSocket Messages

- **Outbound**: `dashboard_update` with full simulation state
- **Inbound**: `ping`, `request_update` for client interaction

## Environment Variables

The dashboard respects all existing simulation environment variables:

```bash
SIMULATOR_AUTO_START=true          # Auto-start simulation on service boot
SIMULATOR_MAX_CLIENTS=10           # Maximum number of concurrent actors
SIMULATOR_ACTION_INTERVAL_MS=1000  # Interval between actor actions
```

## Responsive Design

The dashboard is fully responsive and works on:

- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Tablet devices
- Mobile devices (with touch-friendly controls)

## Browser Compatibility

- Modern browsers with WebSocket support
- Fallback to HTTP polling for older browsers
- ES6+ JavaScript features used (modern browser required)

## Development

To extend the dashboard:

1. **Frontend**: Modify the HTML template in `src/routes/dashboard-api.ts`
2. **Backend**: Extend the WebSocket service in `src/services/websocket/dashboard-websocket.ts`
3. **Data**: Add new metrics in `ClientSimulator.getDetailedStatistics()`

## Troubleshooting

### WebSocket Connection Issues

- Check browser console for error messages
- Verify the service is running on the expected port
- Dashboard will automatically fall back to HTTP polling

### Data Not Updating

- Check if simulation is actually running (`/simulation/stats`)
- Verify WebSocket connection in browser developer tools
- Use the manual refresh button to test data retrieval

### Performance Issues

- WebSocket updates every 2 seconds by default
- Large numbers of actors may impact browser performance
- Consider reducing `SIMULATOR_MAX_CLIENTS` for better dashboard performance

## Security Note

The dashboard is intended for development and monitoring purposes. In production environments, consider implementing authentication and access controls.
