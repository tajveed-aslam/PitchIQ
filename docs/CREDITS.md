# Credits and licences

PitchIQ is a non-commercial portfolio project. All third-party media and models are used under their licences.

## Sample videos (Mixkit, Free License)

Downloaded from [Mixkit](https://mixkit.co). Each clip's page shows the **Free License** (checked 2026-10-29).
Mixkit's free licence allows use in projects without attribution; we credit them anyway. Clips are trimmed and
compressed for the demo and are not redistributed as standalone stock.

| Id | Title on Mixkit | Used for |
|---|---|---|
| 43487 | Very experienced soccer player skillfully juggling the ball | Juggling (full body, night) |
| 43490 | Soccer player juggling the ball with great skill | Juggling (night, low angle) |
| 43513 | Man juggling the ball very skilfully | Juggling (parking garage) |
| 42524 | Practicing ball juggling on a soccer field | Juggling (head out of frame) |
| 42529 | Feet of a skillful soccer player dribbling | Dribbling (feet close-up) |
| 42530 | Skillful dribbles of a football player | Dribbling (feet close-up) |
| 43518 | Soccer player juggling the ball very skillfully | Hard case: dark, close-ups, sitting tricks |
| 42540 | Talented soccer player juggling the ball | Hard case: vertical close-up |
| 42541 | Juggling the ball | To be classified |
| 42543 | Feet of a woman skillfully ball juggling | To be classified |

## AI models

| Model | Source | Licence |
|---|---|---|
| Pose Landmarker (full) | [Google MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) | Apache 2.0 |
| EfficientDet-Lite0 / Lite2 object detector | [Google MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector) | Apache 2.0 |

## Photos

The website's photos are still frames taken from the Mixkit clips above (same Free License): no separate stock
photos, no famous players. Files in `frontend/public/images/`:

| File | From clip | Moment |
|---|---|---|
| hero-bicycle.webp | 43487 | 22.86 s, bicycle-kick attempt |
| high-kick.webp | 43487 | 17.52 s, high foot touch |
| floodlights.webp | 43487 | 2.92 s |
| knee-volley.webp | 43490 | 2.17 s |
| head-height.webp | 43490 | 8.30 s |
| street-juggle.webp | 42524 | 8.0 s |
| garage-session.webp | 43513 | 9.0 s |
| first-touch.webp | 42529 | 4.0 s |

The Global (Main) edition has its own stills, from clips the Lite pages don't use, in `frontend/public/images/main/`
(each with a half-size `-sm` version):

| File | From clip | Moment |
|---|---|---|
| hero-trick.webp | 43518 | 25.6 s, seated juggling trick (landing hero) |
| trick-closeup.webp | 43518 | 27.4 s |
| night-kick.webp | 43487 | 7.2 s, high kick under floodlights |
| neon-dribble.webp | 42530 | 4.9 s |
| thigh-control.webp | 42543 | 8.9 s |
| knee-touch.webp | 42540 | 0.8 s |
| feet-closeup.webp | 42541 | 3.0 s |

The sample videos on the site (`frontend/public/samples/`) are 480p re-encodes of 43487, 43490, 42524 and 43513.

Fictional people in the Global demo: the squad (Lucas Moreira, Sofia Lindqvist, Daniel Okafor, Mei Tanaka, Omar
Haddad, Ella Brennan), the academy applicants and "Demo Coach" are invented names with initials only, no photos.

## Testimonials and people

Testimonials on the landing page are invented examples, labelled "Sample", shown with initials only. Leaderboard
players are fictional. The demo account ("Demo Player") is fictional.

## Software

Next.js, React, Tailwind CSS, lucide-react (ISC), mp4-muxer (MIT), FastAPI, SQLAlchemy, MediaPipe, OpenCV,
Google Gemini API (coaching and help chat).
