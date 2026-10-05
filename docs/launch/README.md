# Launch video

`card.html` is the 1920×1080 title card (`?end` gives the closing card). The video is the cards plus
three examples, joined with 0.5 s crossfades:

```bash
R=skills/isometric-illustrations/scripts/render.mjs; O=out/launch; mkdir -p $O
node $R docs/launch/card.html --selector '#frame' --width 1920 --scale 1 --video $O/a.mp4 --duration 4
node $R "file://$PWD/docs/launch/card.html?end" --selector '#frame' --width 1920 --scale 1 --video $O/e.mp4 --duration 4
node $R examples/packing-line.html --width 1400 --scale 1.5 --video $O/p.mp4 --duration 7
node $R examples/desk-computer.html --width 1400 --scale 1.5 --video $O/d.mp4 --duration 6 \
  --actions '[{"t":0.6,"click":"pc-body"},{"t":2.6,"type":"hello, X"}]'
node $R examples/architecture.html --width 1400 --scale 1.5 --video $O/r.mp4 --duration 5
docs/launch/montage.sh $O        # → $O/iso-launch.mp4 (24 s) and iso-launch.gif
```
