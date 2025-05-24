# Valley Metro GTFS-RT Feed URLs

This document contains the URLs for accessing Valley Metro's GTFS-RT (Real-Time) feeds. These feeds provide real-time information about vehicle locations, service alerts, and trip updates.

## Feed Endpoints

### Vehicle Locations
Provides real-time vehicle position data for all active vehicles in the Valley Metro system.

```
https://mna.mecatran.com/utw/ws/gtfsfeed/vehicles/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true
```

### Service Alerts
Provides real-time service alerts and disruptions affecting Valley Metro services.

```
https://mna.mecatran.com/utw/ws/gtfsfeed/alerts/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true
```

### Trip Updates
Provides real-time updates about trip progress, delays, and schedule changes.

```
https://mna.mecatran.com/utw/ws/gtfsfeed/realtime/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true
```

## Notes
- All feeds are provided in JSON format (asJson=true)
- API key is required for access
- Feeds are updated in real-time