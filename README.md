# GTFS Boss

GTFS Boss is a comprehensive GTFS (General Transit Feed Specification) analysis and validation tool designed for transit agencies and planners. It provides real-time monitoring, validation, and analysis capabilities for GTFS feeds.

## Core Features

### 1. GTFS Feed Validation
- Validates GTFS feeds against GTFS specification requirements
- Checks for data integrity and consistency
- Identifies common GTFS errors and warnings
- Provides detailed validation reports
- Supports both static and real-time GTFS feeds

### 2. Real-Time Monitoring
- Live visualization of vehicle positions
- Schedule adherence monitoring
- Color-coded vehicle status indicators:
  - Green: On time (±1 min)
  - Yellow: Minor delay (±3 min)
  - Red: Major delay (>3 min)
- Interactive map with route, stop, and vehicle information
- Real-time updates of vehicle positions and status

### 3. Interactive Map Features
- Route visualization with color-coding
- Stop locations with detailed information
- Vehicle tracking with status indicators
- Click interactions for detailed information:
  - Routes: Shows route details, ID, and description
  - Stops: Displays stop name, ID, and description
  - Vehicles: Shows vehicle status, route, direction, and schedule information
- Hover effects for better user interaction
- Legend for vehicle status indicators

### 4. Data Management
- Support for multiple GTFS feed formats
- Real-time GTFS-rt feed integration
- Feed version management
- Data import/export capabilities
- Feed update monitoring

## Technical Requirements

- Node.js (v14 or higher)
- React
- TypeScript
- MapTiler SDK
- GTFS-rt feed support

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file
   - Add required API keys and configuration
4. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables
- `VITE_MAPTILER_API_KEY`: Your MapTiler API key
- `VITE_GTFS_API_URL`: URL for GTFS API endpoint
- `VITE_GTFS_RT_API_URL`: URL for GTFS-rt API endpoint

### Map Configuration
- Default center coordinates
- Zoom levels
- Map style
- Vehicle and stop styling

## Contributing

We welcome contributions to GTFS Boss! Please see our contributing guidelines for more information.

## License

[License information to be added]

## Support

For support, please [contact information to be added] 