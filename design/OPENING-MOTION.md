# County opening — motion specification

One flat orange logo, one eased rise, and a reveal through the logo's central star. Anime.js drives a single timeline over the real app. The background is solid beige in light mode and charcoal in dark mode.

| Beat | Time | Behaviour |
| --- | --- | --- |
| Arrival | 80–1120 ms | A slow start, faster middle, and gentle stop, using cubic Bézier (0.45, 0, 0.2, 1). Size and orientation remain constant. |
| Signature | 760–1120 ms | The wordmark eases into view below the mark with a small 6 px movement. |
| Hold | 1120–1420 ms | The full logo rests at the centre without motion. |
| Opening | 1420–1520 ms | The actual app becomes visible inside the negative-space star. The wordmark fades. |
| Enter | 1520–2620 ms | Mark and star scale together using cubic Bézier (0.65, 0, 0.35, 1). The zoom eases at both ends, exposing every viewport corner. |

The aperture follows the four concave circular arcs of the supplied mark rather than a generic circle. Its scale and the logo scale share one animated value so their edges stay aligned. The maximum scale accounts for the star's concave sides and viewport aspect ratio. The mark stays opaque during the zoom, with the app visible through its centre.

No rotation, perspective, bounce, deformation, landing effects, gradients, bevels, or simulated metallic lighting. The initial HTML loading surface stays plain to avoid flashing a centred logo before its arrival. Reduced motion displays a stationary mark and a 160 ms fade. Skip and Escape finish immediately. Cleanup reverts the timeline; replay preserves financial data. Home retains one visible logo lockup.

Elsewhere, navigation uses an 8 px entrance over 340 ms, sheets use 6 px over 240 ms, and transaction rows fade in without moving figures. Buttons give a small positional response on press. Page changes animate only on navigation, not on every data sync. Reduced motion disables the entrance effects. The balance-card gradient still pauses when hidden or covered.
