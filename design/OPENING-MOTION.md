# County opening — motion specification

One flat orange logo, one eased rise, and a reveal through the logo's central star. Anime.js drives one 1.5-second timeline over the real app. The background is solid beige in light mode and charcoal in dark mode; only the centre star is white in dark mode.

| Beat | Time | Behaviour |
| --- | --- | --- |
| Arrival | 0–700 ms | A slow start, faster middle, and gentle stop, using cubic Bézier (0.45, 0, 0.2, 1). Size and orientation remain constant. |
| Signature | 480–700 ms | The wordmark eases into view below the mark with a small 6 px movement. |
| Hold | 700–820 ms | The full logo rests at the centre without motion. |
| Opening | 820–900 ms | The actual app becomes visible inside the star. The wordmark fades. |
| Enter | 900–1500 ms | Mark and star scale together using cubic Bézier (0.65, 0, 0.35, 1). The zoom eases at both ends, exposing every viewport corner. |

The aperture follows the four concave circular arcs of the supplied mark rather than a generic circle. Its scale and the logo scale share one animated value so their edges stay aligned. The maximum scale accounts for the star's concave sides and viewport aspect ratio. The mark stays opaque during the zoom, with the app visible through its centre.

No rotation, perspective, bounce, deformation, landing effects, gradients, bevels, or simulated metallic lighting. The initial HTML and native Android launch window stay plain to avoid flashing a centred logo before its arrival. The native splash exits immediately into the WebView. One persistent intro sits above all data/authentication routes and starts independently of their readiness. A stalled session check shows a recoverable sign-in state after four seconds while preserving the record access gates. Reduced motion displays a stationary mark and a 160 ms fade. Skip, Escape, viewport changes and backgrounding finish immediately. Cleanup reverts the timeline; replay preserves financial data. Home retains one visible logo lockup.

Elsewhere, navigation uses an 8 px entrance over 340 ms, sheets use 6 px over 240 ms, and transaction rows fade in without moving figures. Buttons give a small positional response on press. Page changes animate only on navigation, not on every data sync. Reduced motion disables the entrance effects. The balance-card gradient still pauses when hidden or covered.
