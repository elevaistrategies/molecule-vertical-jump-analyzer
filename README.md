# Vertical Jump Analyzer (Flight Time Method)

Upload a slow-motion jump video, mark:
- Takeoff (feet leave the ground)
- Landing (first ground contact)

Then the app estimates jump height using:
height ≈ (g * t^2) / 8

Where:
- g = 9.81 m/s^2
- t = landingTime - takeoffTime

## Run locally
Option A: Live Server
Option B: Python server:
python -m http.server 5500
Then open http://localhost:5500
