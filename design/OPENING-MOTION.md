# County opening — motion specification

One flat logo, one steady rise, and a reveal through the logo's central star. Anime.js drives a single timeline over the real app. Both themes use solid paper/ink colours throughout the opening.

| Beat | Time | Behaviour |
| --- | --- | --- |
| Arrival | 80–840 ms | The front-facing mark rises from below the viewport with a smooth deceleration. Size and orientation remain constant. |
| Signature | 560–860 ms | The wordmark appears below the mark with a small 6 px movement. |
| Hold | 860–1120 ms | The full logo rests at the centre without motion. |
| Opening | 1120–1220 ms | The actual app becomes visible inside the negative-space star. The wordmark fades. |
| Enter | 1220–1980 ms | Mark and star scale together, creating a continuous zoom through the centre. The star grows until every viewport corner is exposed. |

The aperture follows the four concave circular arcs of the supplied mark rather than a generic circle. Its scale and the logo scale share one animated value so their edges stay aligned. The maximum scale accounts for the star's concave sides and viewport aspect ratio. The mark stays opaque during the zoom, with the app visible through its centre.

No rotation, perspective, bounce, deformation, landing effects, gradients, bevels, or simulated metallic lighting. The initial HTML loading surface stays plain to avoid flashing a centred logo before its arrival. Reduced motion displays a stationary mark and a 160 ms fade. Skip and Escape finish immediately. Cleanup reverts the timeline; replay preserves financial data. Home retains one visible logo lockup.
